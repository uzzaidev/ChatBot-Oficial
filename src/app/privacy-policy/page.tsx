import { redirect } from "next/navigation";

// Alias route for stores/compliance forms that expect /privacy-policy.
export default function PrivacyPolicyAliasPage() {
  redirect("/privacy");
}

