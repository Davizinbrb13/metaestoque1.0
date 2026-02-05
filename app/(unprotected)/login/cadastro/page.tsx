"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Mail,
  Lock,
  Briefcase,
  MapPin,
  Loader2,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

export default function CadastroPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: "",
    area: "", // Vai para o campo 'celula' no banco
    cargo: "",
    email: "",
    senha: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleCadastro(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Envia para a rota /membros do Python
      const response = await fetch("http://localhost:5000/membros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Conta criada com sucesso! Faça login para continuar.");
        router.push("/login"); // Volta para o login
      } else {
        setError(data.erro || "Erro ao criar conta.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erro de conexão. Verifique se a API Python está rodando.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        {/* Cabeçalho */}
        <div className="bg-slate-900 p-6 flex items-center gap-4">
          <Link
            href="/login"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-white">Novo Membro</h2>
            <p className="text-slate-400 text-sm">
              Preencha seus dados da Meta
            </p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleCadastro} className="space-y-4">
            {/* Nome Completo */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Nome Completo
              </label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  name="nome"
                  required
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Davi Moreno"
                />
              </div>
            </div>

            {/* Área / Célula */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Área / Célula
              </label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  name="area"
                  required
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Comercial, Projetos..."
                />
              </div>
            </div>

            {/* Cargo */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Cargo
              </label>
              <div className="relative mt-1">
                <Briefcase className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  name="cargo"
                  required
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Consultor Trainee"
                />
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                E-mail Corporativo
              </label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  name="email"
                  required
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="email@metaconsultoria.com"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">
                Senha de Acesso
              </label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  name="senha"
                  required
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Crie uma senha segura"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Confirmar Cadastro
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
