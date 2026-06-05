"use client";

import { useEffect, useState, useCallback } from "react";
import type { SteamPlayer } from "@/types";

type FormData = { team_name: string; player_name: string; steam_username: string };
const EMPTY: FormData = { team_name: "", player_name: "", steam_username: "" };

export default function AdminPage() {
  const [players, setPlayers] = useState<SteamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addForm, setAddForm] = useState<FormData>(EMPTY);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<FormData>(EMPTY);
  const [editActive, setEditActive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState("");

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/players");
    if (res.ok) setPlayers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAddLoading(true);
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      setAddForm(EMPTY);
      await fetchPlayers();
    } else {
      const d = await res.json();
      setAddError(d.error ?? "추가 실패");
    }
    setAddLoading(false);
  };

  const startEdit = (p: SteamPlayer) => {
    setEditId(p.id);
    setEditForm({
      team_name: p.team_name,
      player_name: p.player_name,
      steam_username: p.steam_username,
    });
    setEditActive(p.is_active);
  };

  const handleSave = async (id: number) => {
    const res = await fetch(`/api/admin/players/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, is_active: editActive }),
    });
    if (res.ok) {
      setEditId(null);
      await fetchPlayers();
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`${name} 선수를 삭제하시겠습니까?`)) return;
    await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
    await fetchPlayers();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshMsg("");
    const res = await fetch("/api/admin/refresh-ranks", { method: "POST" });
    const d = await res.json();
    if (res.ok) {
      setRefreshMsg(
        `완료: 성공 ${d.success}명 / 실패 ${d.failed}명 (시즌: ${d.season})`
      );
      await fetchPlayers();
    } else {
      setRefreshMsg(`오류: ${d.error}`);
    }
    setRefreshing(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* 선수 추가 */}
      <div className="card">
        <h2 className="text-white font-bold text-lg mb-4">선수 추가</h2>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <input
            value={addForm.team_name}
            onChange={(e) => setAddForm({ ...addForm, team_name: e.target.value })}
            placeholder="팀 명"
            required
            className="input flex-1"
          />
          <input
            value={addForm.player_name}
            onChange={(e) => setAddForm({ ...addForm, player_name: e.target.value })}
            placeholder="선수 이름"
            required
            className="input flex-1"
          />
          <input
            value={addForm.steam_username}
            onChange={(e) => setAddForm({ ...addForm, steam_username: e.target.value })}
            placeholder="스팀 아이디 (인게임 닉네임)"
            required
            className="input flex-1"
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={addLoading}>
            {addLoading ? "추가 중..." : "추가"}
          </button>
        </form>
        {addError && <p className="text-red-400 text-sm mt-2">{addError}</p>}
      </div>

      {/* RP 갱신 */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary"
        >
          {refreshing ? "갱신 중..." : "RP 수동 갱신"}
        </button>
        {refreshMsg && (
          <span className="text-sm text-white/60">{refreshMsg}</span>
        )}
        <span className="text-white/30 text-xs ml-auto">
          자동 갱신: 매 시간 정각
        </span>
      </div>

      {/* 선수 목록 */}
      <div className="card overflow-x-auto">
        <h2 className="text-white font-bold text-lg mb-4">
          등록 선수 ({players.length}명)
        </h2>

        {loading ? (
          <p className="text-white/40">불러오는 중...</p>
        ) : players.length === 0 ? (
          <p className="text-white/40">등록된 선수가 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-white/40 border-b border-white/10">
                <th className="pb-3 pr-4">팀</th>
                <th className="pb-3 pr-4">선수명</th>
                <th className="pb-3 pr-4">스팀 아이디</th>
                <th className="pb-3 pr-4">PUBG ID</th>
                <th className="pb-3 pr-4">상태</th>
                <th className="pb-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) =>
                editId === p.id ? (
                  <tr key={p.id} className="border-b border-white/5 bg-white/5">
                    <td className="py-2 pr-3">
                      <input
                        value={editForm.team_name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, team_name: e.target.value })
                        }
                        className="input w-28"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={editForm.player_name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, player_name: e.target.value })
                        }
                        className="input w-28"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        value={editForm.steam_username}
                        onChange={(e) =>
                          setEditForm({ ...editForm, steam_username: e.target.value })
                        }
                        className="input w-36"
                      />
                    </td>
                    <td className="py-2 pr-3 text-white/40">
                      {p.pubg_player_id ? "✓" : "미조회"}
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={editActive ? "1" : "0"}
                        onChange={(e) => setEditActive(e.target.value === "1")}
                        className="input w-20"
                      >
                        <option value="1">활성</option>
                        <option value="0">비활성</option>
                      </select>
                    </td>
                    <td className="py-2 flex gap-2">
                      <button
                        onClick={() => handleSave(p.id)}
                        className="text-pubg-gold hover:text-yellow-300 text-xs"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="text-white/40 hover:text-white text-xs"
                      >
                        취소
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={p.id}
                    className={`border-b border-white/5 ${!p.is_active ? "opacity-40" : ""}`}
                  >
                    <td className="py-3 pr-4 text-white font-medium">{p.team_name}</td>
                    <td className="py-3 pr-4 text-white">{p.player_name}</td>
                    <td className="py-3 pr-4 text-white/70 font-mono text-xs">
                      {p.steam_username}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.pubg_player_id
                            ? "bg-green-900/50 text-green-400"
                            : "bg-yellow-900/50 text-yellow-400"
                        }`}
                      >
                        {p.pubg_player_id ? "확인됨" : "미확인"}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.is_active
                            ? "bg-blue-900/50 text-blue-400"
                            : "bg-white/10 text-white/30"
                        }`}
                      >
                        {p.is_active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="py-3 flex gap-3">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-white/50 hover:text-white text-xs transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(p.id, p.player_name)}
                        className="text-red-500/60 hover:text-red-400 text-xs transition-colors"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
