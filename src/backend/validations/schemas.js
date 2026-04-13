import { z } from 'zod';

export const eventoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  data_evento: z.string().optional().nullable(),
  data_inicio: z.string().optional().nullable(),
  data_fim: z.string().optional().nullable(),
  local: z.string().optional().nullable(),
  cor_primaria: z.string().optional().default('#0ea5e9'),
  tipo_evento: z.string().optional().default('Evento'),
  descricao: z.string().optional().nullable(),
  capacidade_total: z.number().int().optional().default(0),
  printer_ip: z.string().optional().nullable(),
  printer_port: z.number().int().optional().default(9100),
  label_template_json: z.any().optional().nullable(),
  setores: z.array(
    z.object({
      nome: z.string(),
      icone: z.string().optional().default('🏷️'),
      cor: z.string().optional().default('#0ea5e9'),
      capacidade: z.number().int().optional().default(0)
    })
  ).optional()
});

export const convidadoSchema = z.object({
  nome: z.string().min(2, "Nome inválido"),
  categoria: z.string().min(1, "Categoria obrigatória"),
  evento_id: z.union([z.string(), z.number()]),
  cpf: z.string().optional().nullable(),
  telefone: z.string().optional().nullable().or(z.literal('')),
  email: z.string().optional().nullable().or(z.literal('')),
  observacoes: z.string().optional().nullable(),
  tags: z.string().optional().nullable()
});

export const convidadoMassaSchema = z.object({
  evento_id: z.union([z.string(), z.number()]),
  categoria: z.string(),
  nomes: z.array(
    z.union([
      z.string(),
      z.object({
        nome: z.string(),
        cpf: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional()
      })
    ])
  ).max(5000, "Máximo de 5000 convidados por lote")
});

export const checkinMassaSchema = z.object({
  evento_id: z.union([z.string(), z.number()]),
  checkins: z.array(
    z.object({
      qrcode: z.string(),
      data_entrada: z.string().optional().nullable(),
      data_ponto: z.string().optional().nullable()
    })
  ).max(2000, "Máximo de 2000 check-ins por lote")
});

// 🔒 FIX ALTO-02: Política de senha robusta
const senhaSchema = z.string()
  .min(10, "Senha deve ter ao menos 10 caracteres")
  .max(128, "Senha não pode exceder 128 caracteres")
  .regex(/[A-Z]/, "Deve conter ao menos uma letra maiúscula")
  .regex(/[0-9]/, "Deve conter ao menos um número")
  .regex(/[^A-Za-z0-9]/, "Deve conter ao menos um caractere especial (!@#$%^&*)");

export const usuarioSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  usuario: z.string().min(3, "Usuário deve ter mínimo 3 caracteres"),
  senha: senhaSchema.optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'PORTARIA', 'TOTEM'], {
    errorMap: () => ({ message: "Role inserida é inválida ou de escalada não permitida." })
  }),
  permissoes: z.any().optional().nullable()
});

// 🔐 SECURITY: Schema específico para criação que exige senha
export const usuarioCreateSchema = usuarioSchema.extend({
  senha: senhaSchema  // Obrigatória na criação
});
