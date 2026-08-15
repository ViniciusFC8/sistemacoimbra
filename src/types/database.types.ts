export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agenda_eventos: {
        Row: {
          created_at: string
          data_hora: string
          endereco: string | null
          id: string
          observacoes: string | null
          pedido_id: string | null
          responsavel: string | null
          resumo_itens: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_hora: string
          endereco?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel?: string | null
          resumo_itens?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          endereco?: string | null
          id?: string
          observacoes?: string | null
          pedido_id?: string | null
          responsavel?: string | null
          resumo_itens?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_empresa: {
        Row: {
          id: string
          nome_juridico: string
          nome_fantasia: string
          whatsapp: string
          endereco: string
          cidade_estado: string
          cep: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome_juridico: string
          nome_fantasia: string
          whatsapp: string
          endereco: string
          cidade_estado: string
          cep: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome_juridico?: string
          nome_fantasia?: string
          whatsapp?: string
          endereco?: string
          cidade_estado?: string
          cep?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          ativo: boolean
          bairro: string
          cidade: string
          created_at: string
          created_by: string | null
          email: string | null
          endereco: string
          id: string
          nome: string
          observacoes: string | null
          telefone: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bairro: string
          cidade?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco: string
          id?: string
          nome: string
          observacoes?: string | null
          telefone: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string
          cidade?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          endereco?: string
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      itens_estoque: {
        Row: {
          categoria: string | null
          created_at: string
          estoque_minimo: number | null
          id: string
          nome: string
          qtd_alugada: number
          qtd_disponivel: number | null
          qtd_manutencao: number
          qtd_reservada: number
          quantidade_total: number
          status: string | null
          tipo: string
          unidade: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          estoque_minimo?: number | null
          id?: string
          nome: string
          qtd_alugada?: number
          qtd_disponivel?: number | null
          qtd_manutencao?: number
          qtd_reservada?: number
          quantidade_total?: number
          status?: string | null
          tipo: string
          unidade?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          estoque_minimo?: number | null
          id?: string
          nome?: string
          qtd_alugada?: number
          qtd_disponivel?: number | null
          qtd_manutencao?: number
          qtd_reservada?: number
          quantidade_total?: number
          status?: string | null
          tipo?: string
          unidade?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string
          created_by: string
          id: string
          item_id: string
          motivo: string
          quantidade_anterior: number
          quantidade_nova: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          item_id: string
          motivo: string
          quantidade_anterior: number
          quantidade_nova: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          item_id?: string
          motivo?: string
          quantidade_anterior?: number
          quantidade_nova?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          bebidas_por_escrito: string | null
          cliente_id: string | null
          created_at: string
          data_entrega: string
          data_fim_locacao: string | null
          endereco_entrega: string | null
          forma_pagamento: string | null
          horario_entrega: string | null
          id: string
          observacoes: string | null
          responsavel: string | null
          status: string
          tipo_entrega: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          bebidas_por_escrito?: string | null
          cliente_id?: string | null
          created_at?: string
          data_entrega: string
          data_fim_locacao?: string | null
          endereco_entrega?: string | null
          forma_pagamento?: string | null
          horario_entrega?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string
          tipo_entrega: string
          updated_at?: string
          valor_total: number
        }
        Update: {
          bebidas_por_escrito?: string | null
          cliente_id?: string | null
          created_at?: string
          data_entrega?: string
          data_fim_locacao?: string | null
          endereco_entrega?: string | null
          forma_pagamento?: string | null
          horario_entrega?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string
          tipo_entrega?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_itens: {
        Row: {
          id: string
          item_estoque_id: string
          pedido_id: string
          quantidade: number
        }
        Insert: {
          id?: string
          item_estoque_id: string
          pedido_id: string
          quantidade: number
        }
        Update: {
          id?: string
          item_estoque_id?: string
          pedido_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_itens_item_estoque_id_fkey"
            columns: ["item_estoque_id"]
            isOneToOne: false
            referencedRelation: "itens_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          papel: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id: string
          nome: string
          papel: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          papel?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_pedido: {
        Args: {
          p_bebidas_por_escrito: string
          p_cliente_id: string
          p_data_entrega: string
          p_data_fim_locacao: string
          p_endereco_entrega: string
          p_forma_pagamento: string
          p_horario_entrega: string
          p_itens: Json
          p_observacoes: string
          p_pedido_id: string
          p_responsavel: string
          p_tipo_entrega: string
          p_valor_total: number
        }
        Returns: string
      }
      criar_pedido: {
        Args: {
          p_bebidas_por_escrito: string
          p_cliente_id: string
          p_data_entrega: string
          p_data_fim_locacao: string
          p_endereco_entrega: string
          p_forma_pagamento: string
          p_horario_entrega: string
          p_itens: Json
          p_observacoes: string
          p_responsavel: string
          p_status: string
          p_tipo_entrega: string
          p_valor_total: number
        }
        Returns: string
      }
      has_role: { Args: { required_roles: string[] }; Returns: boolean }
      is_active_user: { Args: never; Returns: boolean }
      sync_agenda_from_pedido: {
        Args: { p_pedido_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
