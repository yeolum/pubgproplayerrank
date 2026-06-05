import { NextResponse } from "next/server";

const REPO = "yeolum/pubgproplayerrank";
const WORKFLOW_FILE = "update-ranks.yml";

export async function POST() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN이 설정되지 않았습니다." }, { status: 500 });
  }

  // 워크플로우 트리거
  const triggerRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    }
  );

  if (!triggerRes.ok) {
    const err = await triggerRes.text();
    return NextResponse.json({ error: `트리거 실패: ${err}` }, { status: 500 });
  }

  // 트리거 후 잠시 대기 후 실행 URL 가져오기
  await new Promise((r) => setTimeout(r, 2000));

  const runsRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  const runsData = await runsRes.json();
  const runUrl = runsData.workflow_runs?.[0]?.html_url ??
    `https://github.com/${REPO}/actions/workflows/${WORKFLOW_FILE}`;

  return NextResponse.json({ success: true, runUrl });
}
