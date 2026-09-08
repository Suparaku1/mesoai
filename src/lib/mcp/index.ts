import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCoursesTool from "./tools/list-courses";
import statsTool from "./tools/stats";
import lowStockTool from "./tools/low-stock";
import upcomingHomeworkTool from "./tools/upcoming-homework";
import createCourseTool from "./tools/create-course";
import reviewEnrollmentTool from "./tools/review-enrollment";
import createAnnouncementTool from "./tools/create-announcement";
import createTicketTool from "./tools/create-ticket";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "uendi-mcp",
  title: "Uendi Platform MCP",
  version: "0.3.0",
  instructions:
    "Mjete për platformën Uendi (Shkolla Profesionale Elbasan). Çdo vegël vepron si përdoruesi i lidhur dhe respekton të drejtat e tij: listim kursesh, statistika, inventar, detyra, si dhe krijim kursi, aprovim regjistrimi, njoftime dhe tiket CRM.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listCoursesTool,
    statsTool,
    lowStockTool,
    upcomingHomeworkTool,
    createCourseTool,
    reviewEnrollmentTool,
    createAnnouncementTool,
    createTicketTool,
  ],
});
