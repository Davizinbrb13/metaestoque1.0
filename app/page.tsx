"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Package, RefreshCw, AlertCircle, Boxes, Database } from "lucide-react";

type ApiItem = {
  id?: number | string;
  nome?: string;
  item?: string;
  descricao?: string;
  categoria?: string;
  quantidade?: number;
  estoque?: number;
  localizacao?: string;
  created_at?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

function normalizeItems(payload: unknown): ApiItem[] {
  if (Array.isArray(payload)) return payload as ApiItem[];

  if (payload && typeof payload === "object") {
    const maybeItems = (payload as { itens?: unknown; items?: unknown }).itens ??
      (payload as { itens?: unknown; items?: unknown }).items;

    if (Array.isArray(maybeItems)) return maybeItems as ApiItem[];
  }

  return [];
}

export default function HomePage() {
  const [items, setItems] = useState<ApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const totalItens = useMemo(
    () =>
      items.reduce((acc, current) => {
        const qtd = current.quantidade ?? current.estoque ?? 0;
        return acc + qtd;
      }, 0),
    [items],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoints = ["/itens", "/items"];
      let response: Response | null = null;

      for (const endpoint of endpoints) {
        const request = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (request.ok) {
          response = request;
          break;
        }
      }

      if (!response) {
        throw new Error("Não foi possível encontrar o endpoint de itens na API.");
      }

      const data = await response.json();
      setItems(normalizeItems(data));
    } catch (err) {
      console.error(err);
      setError("Falha ao carregar os itens. Confira se sua API está no ar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <main className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-blue-100">Meta Estoque</p>
              <h1 className="text-3xl font-bold">Painel de Itens</h1>
              <p className="mt-1 text-sm text-blue-100">
                Visualize os ativos que já estão cadastrados no banco de dados.
              </p>
            </div>
            <button
              type="button"
              onClick={loadItems}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Itens cadastrados</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Boxes className="h-6 w-6 text-blue-600" />
              {items.length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Quantidade total em estoque</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Database className="h-6 w-6 text-emerald-600" />
              {totalItens}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-lg font-semibold text-slate-800">Lista de Itens</h2>
          </div>

          {loading && (
            <div className="flex items-center gap-2 p-6 text-slate-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Carregando dados do estoque...
            </div>
          )}

          {!loading && error && (
            <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              <p className="flex items-center gap-2 font-semibold">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="p-6 text-sm text-slate-500">Nenhum item encontrado na API.</div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Categoria
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Quantidade
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Localização
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, index) => {
                    const quantidade = item.quantidade ?? item.estoque ?? 0;
                    const nome = item.nome ?? item.item ?? item.descricao ?? "Sem nome";

                    return (
                      <tr key={`${item.id ?? nome}-${index}`} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          <div className="inline-flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-500" />
                            {nome}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.categoria ?? "Não informado"}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                          {quantidade}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {item.localizacao ?? "Não informado"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
