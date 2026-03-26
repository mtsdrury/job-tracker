import { redirect } from "next/navigation";

export default function ImportRedirect() {
  redirect("/jobs?tab=import");
}
