import { auth } from "@/auth";
import { getCurrentHourLocal } from "@/lib/date-utils";
import { DashboardContent } from "./dashboard-content";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name?.split(" ")[0] || "Usuario";
  const userId = session?.user?.id;

  // Hora de São Paulo — não depende do TZ do processo (ver date-utils.ts)
  const hour = getCurrentHourLocal();
  let greeting = "Boa noite";
  if (hour >= 5 && hour < 12) {
    greeting = "Bom dia";
  } else if (hour >= 12 && hour < 18) {
    greeting = "Boa tarde";
  }

  return (
    <DashboardContent
      userName={userName}
      userId={userId}
      greeting={greeting}
    />
  );
}
