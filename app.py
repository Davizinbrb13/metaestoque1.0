from flask import Flask, jsonify, request
import mysql.connector
from datetime import datetime
from flask_cors import CORS
app = Flask(__name__)

CORS(app)

# --- CONFIGURAÇÃO DO BANCO (Sua Cozinha) ---
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '1234',  # <--- CONFIRA SUA SENHA
    'database': 'db_gestao_ativos'
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

@app.route('/')
def home():
    return "API Gestão de Ativos v1.0 Online! 🚀"

# --- ROTA 1 ATUALIZADA: LISTAR ATIVOS COM STATUS DO EMPRÉSTIMO ---
@app.route('/ativos', methods=['GET'])
def get_ativos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # QUERY AVANÇADA:
    # Traz os dados do item E TAMBÉM os dados de quem está com ele (se tiver alguém)
    sql = """
    SELECT 
        a.*, 
        m.id_membro AS id_membro_atual,
        m.nome_completo AS nome_atual,
        m.email AS email_atual
    FROM tb_ativo a
    LEFT JOIN tb_movimentacao mov ON a.id_ativo = mov.fk_ativo AND mov.data_devolucao IS NULL
    LEFT JOIN tb_membro m ON mov.fk_membro = m.id_membro
    WHERE a.status = 'ATIVO'
    """
    
    cursor.execute(sql)
    ativos = cursor.fetchall()
    
    cursor.close()
    conn.close()
    return jsonify(ativos)

# --- ROTA 2 (RESTAURADA): CADASTRAR NOVO ATIVO (POST) ---
@app.route('/ativos', methods=['POST'])
def cadastrar_ativo():
    novo_ativo = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        sql = """
        INSERT INTO tb_ativo 
        (nome_item, categoria, valor_compra, tipo, vida_util_anos, taxa_depreciacao, quantidade, data_aquisicao, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'ATIVO')
        """
        # Nota: No cadastro, a DATA é obrigatória, então mantemos ela aqui!
        valores = (
            novo_ativo['nome'],
            novo_ativo['categoria'],
            novo_ativo['preco'],
            novo_ativo['tipo'],
            novo_ativo['vida_util'],
            novo_ativo['depreciacao'],
            novo_ativo['quantidade'],
            novo_ativo['data'] # O front-end de cadastro ainda envia a data, e aqui precisamos dela.
        )
        
        cursor.execute(sql, valores)
        conn.commit()
        
        cursor.close()
        conn.close()
        return jsonify({"mensagem": "Item cadastrado com sucesso!"}), 201

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
# --- ROTA 2.5 (ATUALIZADA): ATUALIZAR DADOS (SEM DATA) ---
@app.route('/ativos/<int:id_ativo>', methods=['PUT'])
def atualizar_ativo(id_ativo):
    dados = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # REMOVIDO: data_aquisicao da Query
        sql = """
        UPDATE tb_ativo 
        SET nome_item = %s, categoria = %s, valor_compra = %s, 
            tipo = %s, vida_util_anos = %s, taxa_depreciacao = %s, 
            quantidade = %s
        WHERE id_ativo = %s
        """
        valores = (
            dados['nome'], 
            dados['categoria'], 
            dados['preco'], 
            dados['tipo'],
            dados['vida_util'],
            dados['depreciacao'],
            dados['quantidade'],
            # dados['data'] <- REMOVIDO DAQUI TAMBÉM
            id_ativo
        )
        
        cursor.execute(sql, valores)
        conn.commit()
        
        return jsonify({"mensagem": "Item atualizado com sucesso!"}), 200

    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
# --- ROTA 3 ATUALIZADA: REGISTRAR EMPRÉSTIMO COM VALIDAÇÃO ---
@app.route('/movimentacoes/retirada', methods=['POST'])
def registrar_retirada():
    dados = request.json
    id_ativo = dados['id_ativo']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. O "Guardinha": Verifica se o item já está emprestado (sem data de devolução)
    sql_check = """
    SELECT * FROM tb_movimentacao 
    WHERE fk_ativo = %s AND data_devolucao IS NULL
    """
    cursor.execute(sql_check, (id_ativo,))
    item_ocupado = cursor.fetchone() # Tenta pegar o resultado
    
    # Se encontrou alguma linha, significa que já está com alguém!
    if item_ocupado:
        cursor.close()
        conn.close()
        # Retorna Erro 400 (Bad Request) com aviso
        return jsonify({"erro": "NEGADO: Este item já está emprestado e não foi devolvido!"}), 400
    
    # 2. Se passou pelo guardinha, faz a inserção normal
    sql_insert = "INSERT INTO tb_movimentacao (fk_membro, fk_ativo, observacao) VALUES (%s, %s, %s)"
    valores = (dados['id_membro'], id_ativo, dados['obs'])
    
    cursor.execute(sql_insert, valores)
    conn.commit()
    
    cursor.close()
    conn.close()
    
    return jsonify({"mensagem": "Retirada registrada com sucesso!"}), 201

# --- ROTA 4 CORRIGIDA: REGISTRAR DEVOLUÇÃO COM VALIDAÇÃO ---
@app.route('/movimentacoes/devolucao', methods=['PUT'])
def registrar_devolucao():
    dados = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Tenta atualizar
    sql = """
    UPDATE tb_movimentacao 
    SET data_devolucao = NOW(), 
        observacao = CONCAT(observacao, ' | ', %s)
    WHERE fk_membro = %s AND fk_ativo = %s AND data_devolucao IS NULL
    """
    valores = (dados['obs_final'], dados['id_membro'], dados['id_ativo'])
    
    cursor.execute(sql, valores)
    conn.commit()
    
    # AQUI ESTÁ A MÁGICA: Verificamos se alguma linha foi tocada
    linhas_afetadas = cursor.rowcount
    
    cursor.close()
    conn.close()
    
    if linhas_afetadas == 0:
        # Se for 0, significa que não achou empréstimo aberto
        return jsonify({"erro": "FALHA: Não há registro de retirada pendente para este item e membro."}), 400
    
    return jsonify({"mensagem": "Item devolvido com sucesso!"})

# --- ROTA 5 (INTELIGENTE - CORRIGIDA): EXCLUIR OU ARQUIVAR ATIVO ---
@app.route('/ativos/<int:id_ativo>', methods=['DELETE'])
def deletar_ativo(id_ativo):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # TENTATIVA 1: Exclusão Total (Hard Delete)
        sql_delete = "DELETE FROM tb_ativo WHERE id_ativo = %s"
        cursor.execute(sql_delete, (id_ativo,))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"erro": "Item não encontrado."}), 404
            
        return jsonify({"mensagem": "Item apagado permanentemente!", "tipo": "delete"}), 200

    except mysql.connector.Error as err:
        # Se der erro 1451, significa que tem histórico (FK Constraint)
        if err.errno == 1451:
            
            # PASSO CRÍTICO: Desfaz o DELETE falho antes de tentar o UPDATE
            conn.rollback() 
            
            # TENTATIVA 2: Arquivamento (Soft Delete)
            sql_arquivar = "UPDATE tb_ativo SET status = 'ARQUIVADO' WHERE id_ativo = %s"
            cursor.execute(sql_arquivar, (id_ativo,))
            conn.commit()
            
            return jsonify({"mensagem": "O item possui histórico, então foi movido para ARQUIVADOS.", "tipo": "archive"}), 200
        
        return jsonify({"erro": str(err)}), 500
        
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()
# --- ROTA 6: ARQUIVAR ATIVO (Soft Delete) ---
@app.route('/ativos/<int:id_ativo>/arquivar', methods=['PUT'])
def arquivar_ativo(id_ativo):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Atualiza o status para ARQUIVADO
    sql = "UPDATE tb_ativo SET status = 'ARQUIVADO' WHERE id_ativo = %s"
    cursor.execute(sql, (id_ativo,))
    conn.commit()
    
    # Verifica se achou o item para atualizar
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        return jsonify({"erro": "Item não encontrado."}), 404
        
    cursor.close()
    conn.close()
    
    return jsonify({"mensagem": "Item arquivado com sucesso! Ele não aparecerá mais na lista principal."}), 200

# --- ROTA 7: LISTAR APENAS OS ARQUIVADOS (Lixeira) ---
@app.route('/ativos/arquivados', methods=['GET'])
def get_arquivados():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Busca apenas quem tem a etiqueta 'ARQUIVADO'
    sql = "SELECT * FROM tb_ativo WHERE status = 'ARQUIVADO'"
    cursor.execute(sql)
    ativos_arquivados = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(ativos_arquivados)

# --- ROTA 8: DESARQUIVAR ATIVO (Restaurar) ---
@app.route('/ativos/<int:id_ativo>/desarquivar', methods=['PUT'])
def desarquivar_ativo(id_ativo):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # A Mágica: Traz o item de volta para o status 'ATIVO'
    sql = "UPDATE tb_ativo SET status = 'ATIVO' WHERE id_ativo = %s"
    cursor.execute(sql, (id_ativo,))
    conn.commit()
    
    # Verifica se encontrou o item para atualizar
    if cursor.rowcount == 0:
        cursor.close()
        conn.close()
        return jsonify({"erro": "Item não encontrado ou já está ativo."}), 404
        
    cursor.close()
    conn.close()
    
    return jsonify({"mensagem": "Item restaurado com sucesso! Ele voltou para a lista principal."}), 200

# --- ROTA DE LOGIN (Verifica EMAIL e Senha - COM DEBUG E LIMPEZA) ---
@app.route('/login', methods=['POST'])
def login():
    dados = request.json
    email_user = dados.get('email')
    senha_user = dados.get('senha')
    
    # 1. LIMPEZA CRÍTICA: Remove espaços em branco do início/fim do e-mail
    email_user = email_user.strip() if email_user else None
    
    # DEBUG: Loga o que está sendo procurado (olhe seu terminal do app.py!)
    print(f"--- ATTEMPT LOGIN --- Searching Email: '{email_user}'")
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Busca alguém com esse EMAIL e essa SENHA
    sql = "SELECT * FROM tb_membro WHERE email = %s AND senha_app = %s"
    cursor.execute(sql, (email_user, senha_user)) 
    usuario = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    if usuario:
        return jsonify(usuario), 200 
    else:
        return jsonify({"erro": "E-mail ou Senha incorretos"}), 401
# --- ROTA DE CADASTRO DE MEMBRO (Novo Usuário) ---
@app.route('/membros', methods=['POST'])
def cadastrar_membro():
    novo = request.json
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        sql = """
        INSERT INTO tb_membro (nome_completo, celula, cargo, email, senha_app)
        VALUES (%s, %s, %s, %s, %s)
        """
        val = (novo['nome'], novo['area'], novo['cargo'], novo['email'], novo['senha'])
        cursor.execute(sql, val)
        conn.commit()
        
        novo_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({"mensagem": f"Cadastrado! Seu ID de acesso é: {novo_id}", "id_gerado": novo_id}), 201

    except mysql.connector.IntegrityError as err:
        # Captura erro de duplicidade (Código 1062)
        if err.errno == 1062:
            return jsonify({"erro": "E-mail já cadastrado! Tente fazer login."}), 409
        return jsonify({"erro": str(err)}), 500
        
    except Exception as e:
        return jsonify({"erro": str(e)}), 500
    
if __name__ == '__main__':
    # host='0.0.0.0' libera o acesso para outros dispositivos na rede
    app.run(host='0.0.0.0', port=5000, debug=True)