# Regras Estritas do Projeto: Simulador Smart Home 3D

## 1. Isolamento de Camadas (Arquitetura em 3 Caixas)
- **`/simulation` (Core & Telemetria):** Contém exclusivamente estado dos sensores, timers, simulação de rede e geração de payloads JSON. PROIBIDO importar bibliotecas 3D ou manipular estilos CSS aqui.
- **`/scene` (Visualização 3D):** Contém exclusivamente cena 3D, câmera, iluminação, malhas da casa e raycasting de posicionamento `(x, y, z)`. PROIBIDO alterar estruturas de payload JSON ou regras de negócio aqui.
- **`/ui` (Interface & HUD):** Painéis de controle HTML/CSS, inspetor de requests e botões. Comunica-se com `/scene` e `/simulation` apenas via Estado Global / Eventos.
- **Contrato de Dados (`schema` / `types`):** A comunicação entre o 3D, a UI e a Simulação deve respeitar um contrato fixo de objeto para cada sensor (`id`, `type`, `room`, `position_3d`, `status`, `last_payload`).

## 2. Protocolo de Edição Cirúrgica (Anti-Regressão)
- **Diffs Mínimos:** Ao receber pedidos de ajuste fino (visual ou lógico), edite APENAS a função ou bloco específico. NUNCA reescreva arquivos inteiros desnecessariamente.
- **Escopo Negativo:** Nunca remova variáveis, event listeners, funções auxiliares ou estilos existentes que pareçam "não utilizados" sem autorização explícita.
- **Proteção Cruzada:** Se o prompt pedir um ajuste visual/3D, é estritamente proibido tocar nos arquivos de geração de JSON/lógica (e vice-versa).

## 3. Fluxo de Trabalho (Spec -> Plan -> Execute)
- Para qualquer tarefa que envolva mais de 1 arquivo ou nova funcionalidade, apresente um plano curto listando os arquivos afetados e aguarde aprovação antes de aplicar o diff.
- Mantenha a estrutura 100% compatível com deploy estático/direto na Vercel (caminhos relativos limpos e sem dependências quebradas).
