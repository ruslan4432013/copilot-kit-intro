import { NextResponse } from "next/server";

// Mock-API заявок на возврат. Сюда детерминированно (без участия LLM)
// стучится клиентский перехват события submit_return из A2UI-виджета.
export async function POST(req: Request) {
  const data = await req.json().catch(() => ({}));
  const requestId = `RET-${Math.floor(1000 + Math.random() * 9000)}`;
  console.log("[api/returns] created", requestId, data);
  return NextResponse.json({
    requestId,
    status: "created",
    eta: "Курьер заберёт товар в течение 3 рабочих дней",
    ...data,
  });
}
