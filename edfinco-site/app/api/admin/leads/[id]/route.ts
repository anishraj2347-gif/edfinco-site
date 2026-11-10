// Working a consultation request: change status, assign, add a note, or (admins) delete it.
import { after, type NextRequest } from "next/server";
import { guardStaffPost } from "@/lib/server/admin-guard";
import { audit } from "@/lib/server/audit";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { addNote, assignLead, deleteLead, getLead, LEAD_STATUSES, setLeadStatus, type LeadStatus } from "@/lib/server/leads";
import { notifyAssignee, syncSheet } from "@/lib/server/lead-workflow";
import { assignableStaff } from "@/lib/server/staff";
import { flushSheetQueue, queueLeadDelete } from "@/lib/server/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const g = await guardStaffPost(request);
  if (g instanceof Response) return g;
  const { db, admin: staff } = g;
  const { id } = await params;
  const lead = await getLead(db, id);
  if (!lead) return seeOther("/admin/leads?error=" + encodeURIComponent("That request no longer exists."));

  const form = await readForm(request, 8_000);
  const action = form?.get("action") ?? "";
  const back = (q: string) => seeOther(`/admin/leads/${lead.id}?${q}`);
  // Keep the Google Sheet row in step with status / assignment changes.
  const resync = () =>
    after(async () => {
      const fresh = await getLead(db, lead.id);
      if (fresh) await syncSheet(db, fresh).catch((err) => console.error("[sheets] sync failed", err));
    });

  switch (action) {
    case "status": {
      const status = form?.get("status") ?? "";
      if (!(LEAD_STATUSES as string[]).includes(status)) return back("error=" + encodeURIComponent("Choose a status."));
      await setLeadStatus(db, lead.id, status as LeadStatus, staff.email);
      resync();
      return back("msg=status");
    }
    case "contacted": {
      await setLeadStatus(db, lead.id, "contacted", staff.email);
      if (!lead.assigned_to) await assignLead(db, lead.id, staff.email, staff.email);
      resync();
      return back("msg=status");
    }
    case "assign-me":
      await assignLead(db, lead.id, staff.email, staff.email);
      resync();
      return back("msg=assigned");
    case "assign": {
      // Hand the request to a colleague (any staff member); they're emailed straight away.
      const to = (form?.get("to") ?? "").trim().toLowerCase();
      if (!(await assignableStaff(db)).includes(to)) return back("error=" + encodeURIComponent("Choose someone from the team."));
      if (to === lead.assigned_to) return back("msg=assigned-to");
      await assignLead(db, lead.id, to, staff.email);
      resync();
      after(async () => {
        const fresh = await getLead(db, lead.id);
        if (fresh) await notifyAssignee(db, fresh, staff.email).catch((err) => console.error("[leads] assign email failed", err));
      });
      return back("msg=assigned-to");
    }
    case "unassign":
      await assignLead(db, lead.id, null, staff.email);
      resync();
      return back("msg=unassigned");
    case "note": {
      const body = (form?.get("body") ?? "").trim();
      if (body.length < 1 || body.length > 4000) return back("error=" + encodeURIComponent("Write a note (up to 4000 characters)."));
      await addNote(db, lead.id, staff.email, "note", body);
      return back("msg=note#notes");
    }
    case "delete": {
      if (staff.role !== "admin") return back("error=" + encodeURIComponent("Only admins can delete requests."));
      if (form?.get("confirm") !== "yes") return back("error=" + encodeURIComponent("Tick the box to confirm deleting."));
      const ref = await deleteLead(db, lead.id);
      await audit(db, staff.email, "lead_deleted", null, { ref });
      if (ref) {
        await queueLeadDelete(db, ref); // also removes it from the Google Sheet
        after(() => flushSheetQueue(db).catch((err) => console.error("[sheets] delete failed", err)));
      }
      return seeOther(`/admin/leads?msg=deleted`);
    }
    default:
      return back("error=" + encodeURIComponent("Unknown action."));
  }
}

export const GET = () => methodNotAllowed("POST");
