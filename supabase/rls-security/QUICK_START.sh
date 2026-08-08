#!/bin/bash

# 🚀 COCONUDI - Script de Execução Rápida RLS
# Este script ajuda a executar os scripts SQL via Supabase CLI

set -e

echo "🔐 COCONUDI - Otimização RLS"
echo "================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se Supabase CLI está instalado
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI não está instalado${NC}"
    echo ""
    echo "Instale com:"
    echo "  npm install -g supabase"
    echo ""
    echo "Ou use o Supabase Dashboard:"
    echo "  https://supabase.com/dashboard/project/tnzvhwapfhkhqjgyiomk/sql"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI detectado${NC}"
echo ""

# Verificar se está linkado ao projeto
if [ ! -f ".supabase/config.toml" ]; then
    echo -e "${YELLOW}⚠️  Projeto não está linkado${NC}"
    echo ""
    echo "Linkando ao projeto..."
    supabase link --project-ref tnzvhwapfhkhqjgyiomk
    echo ""
fi

echo -e "${GREEN}✅ Projeto linkado${NC}"
echo ""

# Função para executar script
execute_script() {
    local script_name=$1
    local script_path=$2
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 Executando: $script_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if [ ! -f "$script_path" ]; then
        echo -e "${RED}❌ Arquivo não encontrado: $script_path${NC}"
        return 1
    fi
    
    supabase db execute -f "$script_path"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $script_name executado com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro ao executar $script_name${NC}"
        echo "Verifique os logs acima para detalhes"
        return 1
    fi
    echo ""
}

# Menu principal
echo "Escolha uma opção:"
echo ""
echo "1) Executar TODOS os scripts (CUIDADO! Use apenas se souber o que está fazendo)"
echo "2) Executar apenas Script 01 - Sistema de Roles (CRÍTICO)"
echo "3) Executar Scripts 02 e 03 - Tabelas e Dados Sensíveis (CRÍTICO)"
echo "4) Executar Script 04 - Interações (ALTA)"
echo "5) Executar Script 05 - Auditoria (MÉDIA)"
echo "6) Ver status das políticas RLS"
echo "7) Sair (Use o Dashboard Manual - RECOMENDADO)"
echo ""
read -p "Opção: " option

case $option in
    1)
        echo ""
        echo -e "${YELLOW}⚠️  ATENÇÃO: Você vai executar TODOS os scripts!${NC}"
        read -p "Tem certeza? Digite 'SIM' para confirmar: " confirm
        if [ "$confirm" != "SIM" ]; then
            echo "Operação cancelada"
            exit 0
        fi
        
        execute_script "Script 01 - Sistema de Roles" "supabase/rls-security/01-critical-role-system.sql"
        
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANTE: Você precisa criar um usuário admin!${NC}"
        echo ""
        echo "Execute no SQL Editor:"
        echo "  SELECT auth.uid(); -- Para descobrir seu user_id"
        echo "  INSERT INTO public.user_roles (user_id, role) VALUES ('SEU-USER-ID', 'admin');"
        echo ""
        read -p "Pressione ENTER após criar o admin..."
        
        execute_script "Script 02 - Tabelas Principais" "supabase/rls-security/02-main-tables-policies.sql"
        execute_script "Script 03 - Dados Sensíveis" "supabase/rls-security/03-sensitive-data-protection.sql"
        execute_script "Script 04 - Interações" "supabase/rls-security/04-interaction-tables-policies.sql"
        execute_script "Script 05 - Auditoria" "supabase/rls-security/05-analytics-audit.sql"
        
        echo ""
        echo -e "${GREEN}🎉 Todos os scripts executados!${NC}"
        ;;
        
    2)
        execute_script "Script 01 - Sistema de Roles" "supabase/rls-security/01-critical-role-system.sql"
        
        echo ""
        echo -e "${YELLOW}⚠️  PRÓXIMO PASSO: Criar usuário admin${NC}"
        echo ""
        echo "Execute no SQL Editor do Supabase Dashboard:"
        echo "  1. SELECT auth.uid(); -- Para descobrir seu user_id"
        echo "  2. INSERT INTO public.user_roles (user_id, role) VALUES ('SEU-USER-ID', 'admin');"
        ;;
        
    3)
        execute_script "Script 02 - Tabelas Principais" "supabase/rls-security/02-main-tables-policies.sql"
        execute_script "Script 03 - Dados Sensíveis" "supabase/rls-security/03-sensitive-data-protection.sql"
        ;;
        
    4)
        execute_script "Script 04 - Interações" "supabase/rls-security/04-interaction-tables-policies.sql"
        ;;
        
    5)
        execute_script "Script 05 - Auditoria" "supabase/rls-security/05-analytics-audit.sql"
        ;;
        
    6)
        echo "📊 Status das Políticas RLS"
        echo ""
        supabase db execute -c "
        SELECT 
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies
        WHERE schemaname = 'public'
        GROUP BY tablename
        ORDER BY policy_count DESC
        LIMIT 20;
        "
        ;;
        
    7)
        echo ""
        echo "👉 Use o Supabase Dashboard para executar os scripts manualmente:"
        echo "   https://supabase.com/dashboard/project/tnzvhwapfhkhqjgyiomk/sql"
        echo ""
        echo "Siga o guia em: supabase/rls-security/EXECUTION_GUIDE.md"
        exit 0
        ;;
        
    *)
        echo -e "${RED}❌ Opção inválida${NC}"
        exit 1
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Processo concluído!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 Consulte o guia completo em:"
echo "   supabase/rls-security/EXECUTION_GUIDE.md"
echo ""
