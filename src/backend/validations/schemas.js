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
  )
});

export const checkinMassaSchema = z.object({
  evento_id: z.union([z.string(), z.number()]),
  checkins: z.array(
    z.object({
      qrcode: z.string(),
      // Fix regressão: data_entrada deve ser opcional — check-ins offline simples não incluem timestamp
      data_entrada: z.string().optional().nullable(),
      data_ponto: z.string().optional().nullable()
    })
  )
});

export const usuarioSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  usuario: z.string().min(3, "Usuário deve ter mínimo 3 caracteres"),
  senha: z.string().min(6, "Senha precisa ter mínimo 6 caracteres").optional().nullable(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF', 'PORTARIA', 'TOTEM'], {
    errorMap: () => ({ message: "Role inserida é inválida ou de escalada não permitida." })
  }),
  permissoes: z.any().optional().nullable()
});

// 🔐 SECURITY: Schema específico para criação que exige senha
export const usuarioCreateSchema = usuarioSchema.extend({
  senha: z.string().min(6, "Senha é obrigatória na criação (mínimo 6 caracteres)")
});
