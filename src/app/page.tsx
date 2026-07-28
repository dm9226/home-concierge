import { redirect } from "next/navigation"

// my.carefree-casa.com is the app. Marketing/lead-gen lives on the main site
// (carefree-casa.com). Anyone hitting the app root goes to sign-in; logged-in
// users are already routed to their dashboard/portal by middleware.
export default function Page() {
  redirect("/login")
}
