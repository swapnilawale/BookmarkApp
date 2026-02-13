import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BookmarkDashboard from "@/components/BookmarkDashboard";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <BookmarkDashboard user={user} />;
}
