"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Database,
  Package,
  RefreshCw,
  Search,
} from "lucide-react";

type UnknownRecord = Record<string, unknown>;

type StockItem = {
  id: string;
  nome: string;
  categoria: string;
  quantidade: number;
  localizacao: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

const POSSIBLE_COLLECTION_KEYS = [
  "itens",
  "items",
  "dados",
  "data",
  "estoque",
  "produtos",
  "inventario",
] as const;

const POSSIBLE_ENDPOINTS = [
  "/itens",
  "/items",
  "/estoque",
  "/produtos",
  "/inventario",
] as const;

const ID_KEYS = ["id", "id_item", "item_id", "codigo", "cod_item"] as const;
const NAME_KEYS = ["nome", "item", "descricao", "nome_item", "produto", "titulo"] as const;
const CATEGORY_KEYS = ["categoria", "tipo", "grupo", "classificacao"] as const;
const QTY_KEYS = ["quantidade", "estoque", "qtd", "qtde", "saldo"] as const;
const LOCATION_KEYS = ["localizacao", "local", "setor", "almoxarifado", "endereco"] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getFirstValue<T extends readonly string[]>(obj: UnknownRecord, keys: T): unknown {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
}

function toText(value: unknown, fallback = "Não informado"): string {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizePayload(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord);

  if (!isRecord(payload)) return [];

  for (const key of POSSIBLE_COLLECTION_KEYS) {
    const collection = payload[key];
    if (Array.isArray(collection)) return collection.filter(isRecord);
  }

  return [];
}

function mapApiItem(item: UnknownRecord, index: number): StockItem {
  const idRaw = getFirstValue(item, ID_KEYS);
  const nameRaw = getFirstValue(item, NAME_KEYS);
  const categoryRaw = getFirstValue(item, CATEGORY_KEYS);
  const qtyRaw = getFirstValue(item, QTY_KEYS);
  const locationRaw = getFirstValue(item, LOCATION_KEYS);

  return {
    id: toText(idRaw, `item-${index + 1}`),
    nome: toText(nameRaw, "Sem nome"),
    categoria: toText(categoryRaw),
    quantidade: toNumber(qtyRaw),
    localizacao: toText(locationRaw),
  };
}

export default function HomePage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [endpointUsado, setEndpointUsado] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;

    return items.filter((item) => {
      const haystack = `${item.nome} ${item.categoria} ${item.localizacao}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [items, search]);

  const totalQuantidade = useMemo(
    () => filteredItems.reduce((acc, item) => acc + item.quantidade, 0),
    [filteredItems],
  );

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let payload: unknown = null;
      let endpointOk = "";

      for (const endpoint of POSSIBLE_ENDPOINTS) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, { cache: "no-store" });
        if (!response.ok) continue;

        payload = await response.json();
        endpointOk = endpoint;
        break;
      }

      if (!endpointOk) {
        throw new Error("Nenhuma rota de itens conhecida respondeu com sucesso.");
      }

      const collection = normalizePayload(payload);
      const mapped = collection.map(mapApiItem);

      setItems(mapped);
      setEndpointUsado(endpointOk);
    } catch (err) {
      console.error(err);
      setError("Não consegui carregar os itens da API. Verifique backend, CORS e endpoint.");
      setItems([]);
      setEndpointUsado("");
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-blue-100">Meta Estoque</p>
              <h1 className="text-3xl font-bold">Homepage de Itens</h1>
              <p className="mt-1 text-sm text-blue-100">
                Conectada à API em <span className="font-semibold">{API_BASE_URL}</span>
              </p>
              {endpointUsado && (
                <p className="mt-1 text-xs text-blue-100">Endpoint ativo: {endpointUsado}</p>
              )}
            </div>

            <button
              type="button"
              onClick={loadItems}
              className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
            >
              <RefreshCw className="h-4 w-4" />
              Recarregar API
            </button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Itens (resultado atual)</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Boxes className="h-6 w-6 text-blue-600" />
              {filteredItems.length}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Quantidade total</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-bold text-slate-800">
              <Database className="h-6 w-6 text-emerald-600" />
              {totalQuantidade}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm text-slate-500">Buscar item</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nome, categoria, local..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none ring-blue-500 focus:ring"
              />
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-lg font-semibold text-slate-800">Itens cadastrados</h2>
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

          {!loading && !error && filteredItems.length === 0 && (
            <div className="p-6 text-sm text-slate-500">
              Nenhum item encontrado para o JSON retornado pela API.
            </div>
          )}

          {!loading && !error && filteredItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      ID
                    </th>
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
                  {filteredItems.map((item) => (
                    <tr key={`${item.id}-${item.nome}`} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500">{item.id}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="inline-flex items-center gap-2">
                          <Package className="h-4 w-4 text-blue-500" />
                          {item.nome}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.categoria}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                        {item.quantidade}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.localizacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
