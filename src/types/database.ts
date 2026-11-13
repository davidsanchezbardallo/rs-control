
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "absences": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"days": number,"employee_id": string,"end_date": string,"id": string,"kind": Database["public"]['Enums']["absence_kind"],"notes": string | null,"start_date": string,"status": Database["public"]['Enums']["absence_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"days": number,"employee_id": string,"end_date": string,"id"?: string,"kind": Database["public"]['Enums']["absence_kind"],"notes"?: string | null,"start_date": string,"status"?: Database["public"]['Enums']["absence_status"]
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"days"?: number,"employee_id"?: string,"end_date"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["absence_kind"],"notes"?: string | null,"start_date"?: string,"status"?: Database["public"]['Enums']["absence_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "absences_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "absences_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"bank_accounts": {
                  Row: {
                    "bank_balance": number | null,"bank_balance_at": string | null,"bank_name": string | null,"company_id": string,"created_at": string,"iban": string | null,"id": string,"is_active": boolean,"name": string,"opening_balance": number,"opening_date": string,"sync_mode": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bank_balance"?: number | null,"bank_balance_at"?: string | null,"bank_name"?: string | null,"company_id"?: string,"created_at"?: string,"iban"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"opening_balance"?: number,"opening_date"?: string,"sync_mode"?: string
                  }
                  Update: {
                    "bank_balance"?: number | null,"bank_balance_at"?: string | null,"bank_name"?: string | null,"company_id"?: string,"created_at"?: string,"iban"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"opening_balance"?: number,"opening_date"?: string,"sync_mode"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bank_accounts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"bank_connection_accounts": {
                  Row: {
                    "bank_account_id": string | null,"company_id": string,"connection_id": string,"created_at": string,"currency": string | null,"external_uid": string,"iban": string | null,"id": string,"last_error": string | null,"last_synced_at": string | null,"name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bank_account_id"?: string | null,"company_id": string,"connection_id": string,"created_at"?: string,"currency"?: string | null,"external_uid": string,"iban"?: string | null,"id"?: string,"last_error"?: string | null,"last_synced_at"?: string | null,"name"?: string | null
                  }
                  Update: {
                    "bank_account_id"?: string | null,"company_id"?: string,"connection_id"?: string,"created_at"?: string,"currency"?: string | null,"external_uid"?: string,"iban"?: string | null,"id"?: string,"last_error"?: string | null,"last_synced_at"?: string | null,"name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bank_connection_accounts_bank_account_id_fkey"
      columns: ["bank_account_id"]
isOneToOne: false
      referencedRelation: "bank_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bank_connection_accounts_bank_account_id_fkey"
      columns: ["bank_account_id"]
isOneToOne: false
      referencedRelation: "v_bank_balances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bank_connection_accounts_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bank_connection_accounts_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: false
      referencedRelation: "bank_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"bank_connection_secrets": {
                  Row: {
                    "connection_id": string,"session_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "connection_id": string,"session_id": string,"updated_at"?: string
                  }
                  Update: {
                    "connection_id"?: string,"session_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bank_connection_secrets_connection_id_fkey"
      columns: ["connection_id"]
isOneToOne: true
      referencedRelation: "bank_connections"
      referencedColumns: ["id"]
    }
                  ]
                },"bank_connections": {
                  Row: {
                    "aspsp_country": string,"aspsp_name": string,"authorized_at": string | null,"company_id": string,"created_at": string,"created_by": string | null,"id": string,"last_error": string | null,"last_synced_at": string | null,"psu_type": string,"state": string,"status": Database["public"]['Enums']["bank_connection_status"],"valid_until": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "aspsp_country"?: string,"aspsp_name": string,"authorized_at"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_error"?: string | null,"last_synced_at"?: string | null,"psu_type"?: string,"state"?: string,"status"?: Database["public"]['Enums']["bank_connection_status"],"valid_until"?: string | null
                  }
                  Update: {
                    "aspsp_country"?: string,"aspsp_name"?: string,"authorized_at"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"last_error"?: string | null,"last_synced_at"?: string | null,"psu_type"?: string,"state"?: string,"status"?: Database["public"]['Enums']["bank_connection_status"],"valid_until"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bank_connections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "address": string | null,"city": string | null,"company_id": string,"contact_name": string | null,"created_at": string,"email": string | null,"id": string,"is_active": boolean,"kind": Database["public"]['Enums']["client_kind"],"legal_rep_name": string | null,"legal_rep_tax_id": string | null,"name": string,"notes": string | null,"phone": string | null,"postal_code": string | null,"province": string | null,"tax_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"company_id"?: string,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["client_kind"],"legal_rep_name"?: string | null,"legal_rep_tax_id"?: string | null,"name": string,"notes"?: string | null,"phone"?: string | null,"postal_code"?: string | null,"province"?: string | null,"tax_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"company_id"?: string,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["client_kind"],"legal_rep_name"?: string | null,"legal_rep_tax_id"?: string | null,"name"?: string,"notes"?: string | null,"phone"?: string | null,"postal_code"?: string | null,"province"?: string | null,"tax_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "address": string | null,"city": string | null,"created_at": string,"email": string | null,"id": string,"name": string,"phone": string | null,"phone_2": string | null,"settings": NonNullable<Json>,"tagline": string | null,"tax_id": string | null,"trade_name": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"city"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name": string,"phone"?: string | null,"phone_2"?: string | null,"settings"?: NonNullable<Json>,"tagline"?: string | null,"tax_id"?: string | null,"trade_name"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"city"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"name"?: string,"phone"?: string | null,"phone_2"?: string | null,"settings"?: NonNullable<Json>,"tagline"?: string | null,"tax_id"?: string | null,"trade_name"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"documents": {
                  Row: {
                    "category": Database["public"]['Enums']["document_category"],"company_id": string,"created_at": string,"employee_id": string | null,"expires_on": string | null,"id": string,"invoice_id": string | null,"issued_on": string | null,"mime_type": string | null,"project_id": string | null,"size_bytes": number | null,"storage_path": string,"title": string,"uploaded_by": string | null,"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["document_category"],"company_id"?: string,"created_at"?: string,"employee_id"?: string | null,"expires_on"?: string | null,"id"?: string,"invoice_id"?: string | null,"issued_on"?: string | null,"mime_type"?: string | null,"project_id"?: string | null,"size_bytes"?: number | null,"storage_path": string,"title": string,"uploaded_by"?: string | null,"vehicle_id"?: string | null
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["document_category"],"company_id"?: string,"created_at"?: string,"employee_id"?: string | null,"expires_on"?: string | null,"id"?: string,"invoice_id"?: string | null,"issued_on"?: string | null,"mime_type"?: string | null,"project_id"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"title"?: string,"uploaded_by"?: string | null,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "v_invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "documents_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"employees": {
                  Row: {
                    "code": string,"company_id": string,"cost_category_id": string | null,"created_at": string,"email": string | null,"end_date": string | null,"first_name": string,"hire_date": string | null,"id": string,"job_title": string | null,"last_name": string,"national_id": string | null,"notes": string | null,"phone": string | null,"status": Database["public"]['Enums']["employee_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"company_id"?: string,"cost_category_id"?: string | null,"created_at"?: string,"email"?: string | null,"end_date"?: string | null,"first_name": string,"hire_date"?: string | null,"id"?: string,"job_title"?: string | null,"last_name": string,"national_id"?: string | null,"notes"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["employee_status"],"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"company_id"?: string,"cost_category_id"?: string | null,"created_at"?: string,"email"?: string | null,"end_date"?: string | null,"first_name"?: string,"hire_date"?: string | null,"id"?: string,"job_title"?: string | null,"last_name"?: string,"national_id"?: string | null,"notes"?: string | null,"phone"?: string | null,"status"?: Database["public"]['Enums']["employee_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "employees_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "employees_cost_category_id_fkey"
      columns: ["cost_category_id"]
isOneToOne: false
      referencedRelation: "labor_cost_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"financial_transactions": {
                  Row: {
                    "account_id": string,"amount": number,"bank_details": string | null,"category": string | null,"client_id": string | null,"company_id": string,"counterparty_name": string | null,"created_at": string,"created_by": string | null,"description": string,"external_id": string | null,"id": string,"kind": Database["public"]['Enums']["transaction_kind"],"project_id": string | null,"source": string,"status": Database["public"]['Enums']["transaction_status"],"supplier_id": string | null,"transfer_group": string | null,"tx_date": string,"value_date": string | null,"void_reason": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id": string,"amount": number,"bank_details"?: string | null,"category"?: string | null,"client_id"?: string | null,"company_id"?: string,"counterparty_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"description": string,"external_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["transaction_kind"],"project_id"?: string | null,"source"?: string,"status"?: Database["public"]['Enums']["transaction_status"],"supplier_id"?: string | null,"transfer_group"?: string | null,"tx_date": string,"value_date"?: string | null,"void_reason"?: string | null
                  }
                  Update: {
                    "account_id"?: string,"amount"?: number,"bank_details"?: string | null,"category"?: string | null,"client_id"?: string | null,"company_id"?: string,"counterparty_name"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"external_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["transaction_kind"],"project_id"?: string | null,"source"?: string,"status"?: Database["public"]['Enums']["transaction_status"],"supplier_id"?: string | null,"transfer_group"?: string | null,"tx_date"?: string,"value_date"?: string | null,"void_reason"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "financial_transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "bank_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "v_bank_balances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "financial_transactions_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "company_id": string,"created_at": string,"description": string | null,"id": string,"number": string | null,"photo_paths": (string)[],"project_id": string | null,"reported_by": string | null,"reported_by_employee": string | null,"resolution": string | null,"resolved_at": string | null,"severity": Database["public"]['Enums']["incident_severity"],"status": Database["public"]['Enums']["incident_status"],"title": string,"updated_at": string,"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"number"?: string | null,"photo_paths"?: (string)[],"project_id"?: string | null,"reported_by"?: string | null,"reported_by_employee"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"severity"?: Database["public"]['Enums']["incident_severity"],"status"?: Database["public"]['Enums']["incident_status"],"title": string,"updated_at"?: string,"vehicle_id"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"number"?: string | null,"photo_paths"?: (string)[],"project_id"?: string | null,"reported_by"?: string | null,"reported_by_employee"?: string | null,"resolution"?: string | null,"resolved_at"?: string | null,"severity"?: Database["public"]['Enums']["incident_severity"],"status"?: Database["public"]['Enums']["incident_status"],"title"?: string,"updated_at"?: string,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "incidents_reported_by_employee_fkey"
      columns: ["reported_by_employee"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incidents_vehicle_fk"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"inventory_documents": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string,"employee_id": string | null,"id": string,"kind": Database["public"]['Enums']["inventory_kind"],"notes": string | null,"number": string,"occurred_at": string,"project_id": string | null,"reason": string | null,"received_confirmed_at": string | null,"received_confirmed_by": string | null,"reference": string | null,"request_id": string | null,"reversed_by_document_id": string | null,"reverses_document_id": string | null,"supplier_id": string | null,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by": string,"employee_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["inventory_kind"],"notes"?: string | null,"number": string,"occurred_at"?: string,"project_id"?: string | null,"reason"?: string | null,"received_confirmed_at"?: string | null,"received_confirmed_by"?: string | null,"reference"?: string | null,"request_id"?: string | null,"reversed_by_document_id"?: string | null,"reverses_document_id"?: string | null,"supplier_id"?: string | null,"warehouse_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string,"employee_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["inventory_kind"],"notes"?: string | null,"number"?: string,"occurred_at"?: string,"project_id"?: string | null,"reason"?: string | null,"received_confirmed_at"?: string | null,"received_confirmed_by"?: string | null,"reference"?: string | null,"request_id"?: string | null,"reversed_by_document_id"?: string | null,"reverses_document_id"?: string | null,"supplier_id"?: string | null,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "inventory_documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "inventory_documents_request_fk"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_reversed_by_document_id_fkey"
      columns: ["reversed_by_document_id"]
isOneToOne: false
      referencedRelation: "inventory_documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_reverses_document_id_fkey"
      columns: ["reverses_document_id"]
isOneToOne: false
      referencedRelation: "inventory_documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "inventory_documents_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"invoice_payments": {
                  Row: {
                    "amount": number,"company_id": string,"created_at": string,"id": string,"invoice_id": string,"transaction_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"company_id"?: string,"created_at"?: string,"id"?: string,"invoice_id": string,"transaction_id": string
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"created_at"?: string,"id"?: string,"invoice_id"?: string,"transaction_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoice_payments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoice_payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoice_payments_invoice_id_fkey"
      columns: ["invoice_id"]
isOneToOne: false
      referencedRelation: "v_invoices"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoice_payments_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "financial_transactions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoice_payments_transaction_id_fkey"
      columns: ["transaction_id"]
isOneToOne: false
      referencedRelation: "v_transactions_reconciliation"
      referencedColumns: ["id"]
    }
                  ]
                },"invoices": {
                  Row: {
                    "base_amount": number,"client_id": string | null,"company_id": string,"concept": string | null,"created_at": string,"created_by": string | null,"destination": Database["public"]['Enums']["invoice_destination"] | null,"direction": Database["public"]['Enums']["invoice_direction"],"due_date": string | null,"external_ref": string | null,"guarantee_amount": number,"guarantee_release_date": string | null,"id": string,"irpf_amount": number,"issue_date": string,"notes": string | null,"number": string,"pdf_path": string | null,"project_id": string | null,"supplier_id": string | null,"total_amount": number | null,"updated_at": string,"vat_amount": number,"vat_regime": Database["public"]['Enums']["vat_regime"],"void_reason": string | null,"voided_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "base_amount": number,"client_id"?: string | null,"company_id"?: string,"concept"?: string | null,"created_at"?: string,"created_by"?: string | null,"destination"?: Database["public"]['Enums']["invoice_destination"] | null,"direction": Database["public"]['Enums']["invoice_direction"],"due_date"?: string | null,"external_ref"?: string | null,"guarantee_amount"?: number,"guarantee_release_date"?: string | null,"id"?: string,"irpf_amount"?: number,"issue_date": string,"notes"?: string | null,"number": string,"pdf_path"?: string | null,"project_id"?: string | null,"supplier_id"?: string | null,"total_amount"?: never,"updated_at"?: string,"vat_amount"?: number,"vat_regime"?: Database["public"]['Enums']["vat_regime"],"void_reason"?: string | null,"voided_at"?: string | null
                  }
                  Update: {
                    "base_amount"?: number,"client_id"?: string | null,"company_id"?: string,"concept"?: string | null,"created_at"?: string,"created_by"?: string | null,"destination"?: Database["public"]['Enums']["invoice_destination"] | null,"direction"?: Database["public"]['Enums']["invoice_direction"],"due_date"?: string | null,"external_ref"?: string | null,"guarantee_amount"?: number,"guarantee_release_date"?: string | null,"id"?: string,"irpf_amount"?: number,"issue_date"?: string,"notes"?: string | null,"number"?: string,"pdf_path"?: string | null,"project_id"?: string | null,"supplier_id"?: string | null,"total_amount"?: never,"updated_at"?: string,"vat_amount"?: number,"vat_regime"?: Database["public"]['Enums']["vat_regime"],"void_reason"?: string | null,"voided_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invoices_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "invoices_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"labor_cost_categories": {
                  Row: {
                    "company_id": string,"created_at": string,"hourly_cost": number,"id": string,"is_active": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"created_at"?: string,"hourly_cost": number,"id"?: string,"is_active"?: boolean,"name": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"hourly_cost"?: number,"id"?: string,"is_active"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "labor_cost_categories_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"loans": {
                  Row: {
                    "account_id": string | null,"company_id": string,"created_at": string,"end_date": string | null,"id": string,"installment_amount": number | null,"interest_rate": number | null,"is_active": boolean,"kind": Database["public"]['Enums']["loan_kind"],"lender": string,"notes": string | null,"outstanding": number,"payment_day": number | null,"principal": number,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "account_id"?: string | null,"company_id"?: string,"created_at"?: string,"end_date"?: string | null,"id"?: string,"installment_amount"?: number | null,"interest_rate"?: number | null,"is_active"?: boolean,"kind": Database["public"]['Enums']["loan_kind"],"lender": string,"notes"?: string | null,"outstanding": number,"payment_day"?: number | null,"principal": number,"start_date": string
                  }
                  Update: {
                    "account_id"?: string | null,"company_id"?: string,"created_at"?: string,"end_date"?: string | null,"id"?: string,"installment_amount"?: number | null,"interest_rate"?: number | null,"is_active"?: boolean,"kind"?: Database["public"]['Enums']["loan_kind"],"lender"?: string,"notes"?: string | null,"outstanding"?: number,"payment_day"?: number | null,"principal"?: number,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "loans_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "bank_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loans_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "v_bank_balances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "loans_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"material_categories": {
                  Row: {
                    "company_id": string,"id": string,"name": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"id"?: string,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "company_id"?: string,"id"?: string,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_categories_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"material_request_items": {
                  Row: {
                    "approved_quantity": number | null,"delivered_quantity": number,"free_text": string | null,"id": string,"material_id": string | null,"quantity": number,"request_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_quantity"?: number | null,"delivered_quantity"?: number,"free_text"?: string | null,"id"?: string,"material_id"?: string | null,"quantity": number,"request_id": string
                  }
                  Update: {
                    "approved_quantity"?: number | null,"delivered_quantity"?: number,"free_text"?: string | null,"id"?: string,"material_id"?: string | null,"quantity"?: number,"request_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_request_items_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_request_items_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "v_stock"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_request_items_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "material_requests"
      referencedColumns: ["id"]
    }
                  ]
                },"material_requests": {
                  Row: {
                    "company_id": string,"created_at": string,"employee_id": string,"id": string,"needed_by": string | null,"notes": string | null,"number": string,"priority": Database["public"]['Enums']["request_priority"],"project_id": string,"requested_by": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["request_status"],"status_reason": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"employee_id": string,"id"?: string,"needed_by"?: string | null,"notes"?: string | null,"number": string,"priority"?: Database["public"]['Enums']["request_priority"],"project_id": string,"requested_by": string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"status_reason"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"employee_id"?: string,"id"?: string,"needed_by"?: string | null,"notes"?: string | null,"number"?: string,"priority"?: Database["public"]['Enums']["request_priority"],"project_id"?: string,"requested_by"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"status_reason"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "material_requests_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "material_requests_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "brand": string | null,"category_id": string | null,"code": string,"company_id": string,"created_at": string,"default_supplier_id": string | null,"description": string | null,"id": string,"location": string | null,"min_stock": number,"model_ref": string | null,"name": string,"status": Database["public"]['Enums']["material_status"],"unit_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"category_id"?: string | null,"code": string,"company_id"?: string,"created_at"?: string,"default_supplier_id"?: string | null,"description"?: string | null,"id"?: string,"location"?: string | null,"min_stock"?: number,"model_ref"?: string | null,"name": string,"status"?: Database["public"]['Enums']["material_status"],"unit_id": string,"updated_at"?: string
                  }
                  Update: {
                    "brand"?: string | null,"category_id"?: string | null,"code"?: string,"company_id"?: string,"created_at"?: string,"default_supplier_id"?: string | null,"description"?: string | null,"id"?: string,"location"?: string | null,"min_stock"?: number,"model_ref"?: string | null,"name"?: string,"status"?: Database["public"]['Enums']["material_status"],"unit_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "material_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_default_supplier_id_fkey"
      columns: ["default_supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_unit_id_fkey"
      columns: ["unit_id"]
isOneToOne: false
      referencedRelation: "units"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"company_id": string,"created_at": string,"id": string,"kind": string,"link": string | null,"read_at": string | null,"recipient_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"kind": string,"link"?: string | null,"read_at"?: string | null,"recipient_id": string,"title": string
                  }
                  Update: {
                    "body"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"kind"?: string,"link"?: string | null,"read_at"?: string | null,"recipient_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_recipient_id_fkey"
      columns: ["recipient_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"ppe_deliveries": {
                  Row: {
                    "acknowledged": boolean,"company_id": string,"created_at": string,"delivered_on": string,"employee_id": string,"id": string,"item": string,"next_renewal_on": string | null,"notes": string | null,"quantity": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acknowledged"?: boolean,"company_id"?: string,"created_at"?: string,"delivered_on"?: string,"employee_id": string,"id"?: string,"item": string,"next_renewal_on"?: string | null,"notes"?: string | null,"quantity"?: number
                  }
                  Update: {
                    "acknowledged"?: boolean,"company_id"?: string,"created_at"?: string,"delivered_on"?: string,"employee_id"?: string,"id"?: string,"item"?: string,"next_renewal_on"?: string | null,"notes"?: string | null,"quantity"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "ppe_deliveries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ppe_deliveries_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "company_id": string,"created_at": string,"employee_id": string | null,"full_name": string,"id": string,"is_active": boolean,"role": Database["public"]['Enums']["app_role"],"updated_at": string,"username": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"employee_id"?: string | null,"full_name": string,"id": string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"username": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"employee_id"?: string | null,"full_name"?: string,"id"?: string,"is_active"?: boolean,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_employee_fk"
      columns: ["employee_id"]
isOneToOne: true
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"project_assignments": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"employee_id": string,"end_date": string | null,"id": string,"notes": string | null,"project_id": string,"role_in_project": string | null,"start_date": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"employee_id": string,"end_date"?: string | null,"id"?: string,"notes"?: string | null,"project_id": string,"role_in_project"?: string | null,"start_date"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"employee_id"?: string,"end_date"?: string | null,"id"?: string,"notes"?: string | null,"project_id"?: string,"role_in_project"?: string | null,"start_date"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_assignments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_assignments_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_assignments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_assignments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    }
                  ]
                },"project_budget_items": {
                  Row: {
                    "amount": number,"company_id": string,"created_at": string,"id": string,"item_date": string,"kind": Database["public"]['Enums']["budget_kind"],"notes": string | null,"project_id": string,"reference": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"company_id"?: string,"created_at"?: string,"id"?: string,"item_date"?: string,"kind": Database["public"]['Enums']["budget_kind"],"notes"?: string | null,"project_id": string,"reference"?: string | null
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"created_at"?: string,"id"?: string,"item_date"?: string,"kind"?: Database["public"]['Enums']["budget_kind"],"notes"?: string | null,"project_id"?: string,"reference"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_budget_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_budget_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_budget_items_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    }
                  ]
                },"project_cost_estimates": {
                  Row: {
                    "amount": number,"category": Database["public"]['Enums']["cost_category"],"company_id": string,"id": string,"project_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": Database["public"]['Enums']["cost_category"],"company_id"?: string,"id"?: string,"project_id": string
                  }
                  Update: {
                    "amount"?: number,"category"?: Database["public"]['Enums']["cost_category"],"company_id"?: string,"id"?: string,"project_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_cost_estimates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_cost_estimates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_cost_estimates_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    }
                  ]
                },"project_expenses": {
                  Row: {
                    "amount": number,"category": Database["public"]['Enums']["cost_category"],"company_id": string,"created_at": string,"created_by": string | null,"description": string,"employee_id": string | null,"expense_date": string,"hourly_rate": number | null,"hours": number | null,"id": string,"project_id": string,"supplier_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"category": Database["public"]['Enums']["cost_category"],"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description": string,"employee_id"?: string | null,"expense_date"?: string,"hourly_rate"?: number | null,"hours"?: number | null,"id"?: string,"project_id": string,"supplier_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"category"?: Database["public"]['Enums']["cost_category"],"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"employee_id"?: string | null,"expense_date"?: string,"hourly_rate"?: number | null,"hours"?: number | null,"id"?: string,"project_id"?: string,"supplier_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_expenses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_expenses_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_expenses_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_expenses_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "project_expenses_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"project_status_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"from_status": Database["public"]['Enums']["project_status"] | null,"id": number,"project_id": string,"to_status": Database["public"]['Enums']["project_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["project_status"] | null,"id"?: never,"project_id": string,"to_status": Database["public"]['Enums']["project_status"]
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"from_status"?: Database["public"]['Enums']["project_status"] | null,"id"?: never,"project_id"?: string,"to_status"?: Database["public"]['Enums']["project_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_status_history_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_status_history_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "actual_end_date": string | null,"address": string | null,"city": string | null,"client_id": string | null,"code": string,"company_id": string,"created_at": string,"created_by": string | null,"description": string | null,"id": string,"manager_employee_id": string | null,"name": string,"notes": string | null,"planned_end_date": string | null,"postal_code": string | null,"province": string | null,"site_contact_name": string | null,"site_contact_phone": string | null,"start_date": string | null,"status": Database["public"]['Enums']["project_status"],"updated_at": string,"work_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_end_date"?: string | null,"address"?: string | null,"city"?: string | null,"client_id"?: string | null,"code": string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"manager_employee_id"?: string | null,"name": string,"notes"?: string | null,"planned_end_date"?: string | null,"postal_code"?: string | null,"province"?: string | null,"site_contact_name"?: string | null,"site_contact_phone"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string,"work_type"?: string | null
                  }
                  Update: {
                    "actual_end_date"?: string | null,"address"?: string | null,"city"?: string | null,"client_id"?: string | null,"code"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"id"?: string,"manager_employee_id"?: string | null,"name"?: string,"notes"?: string | null,"planned_end_date"?: string | null,"postal_code"?: string | null,"province"?: string | null,"site_contact_name"?: string | null,"site_contact_phone"?: string | null,"start_date"?: string | null,"status"?: Database["public"]['Enums']["project_status"],"updated_at"?: string,"work_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_manager_employee_id_fkey"
      columns: ["manager_employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"recurring_commitments": {
                  Row: {
                    "amount": number,"company_id": string,"counterparty": string | null,"created_at": string,"day_of_month": number,"end_date": string | null,"frequency": Database["public"]['Enums']["frequency"],"id": string,"is_active": boolean,"is_estimate": boolean,"kind": Database["public"]['Enums']["commitment_kind"],"name": string,"start_date": string,"vehicle_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"company_id"?: string,"counterparty"?: string | null,"created_at"?: string,"day_of_month"?: number,"end_date"?: string | null,"frequency"?: Database["public"]['Enums']["frequency"],"id"?: string,"is_active"?: boolean,"is_estimate"?: boolean,"kind": Database["public"]['Enums']["commitment_kind"],"name": string,"start_date"?: string,"vehicle_id"?: string | null
                  }
                  Update: {
                    "amount"?: number,"company_id"?: string,"counterparty"?: string | null,"created_at"?: string,"day_of_month"?: number,"end_date"?: string | null,"frequency"?: Database["public"]['Enums']["frequency"],"id"?: string,"is_active"?: boolean,"is_estimate"?: boolean,"kind"?: Database["public"]['Enums']["commitment_kind"],"name"?: string,"start_date"?: string,"vehicle_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "commitments_vehicle_fk"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "recurring_commitments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_balances": {
                  Row: {
                    "avg_unit_cost": number,"company_id": string,"last_movement_at": string | null,"material_id": string,"quantity": number,"stock_value": number,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avg_unit_cost"?: number,"company_id": string,"last_movement_at"?: string | null,"material_id": string,"quantity"?: number,"stock_value"?: number,"warehouse_id": string
                  }
                  Update: {
                    "avg_unit_cost"?: number,"company_id"?: string,"last_movement_at"?: string | null,"material_id"?: string,"quantity"?: number,"stock_value"?: number,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_balances_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_balances_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_balances_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "v_stock"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_balances_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"stock_movements": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string,"document_id": string,"employee_id": string | null,"id": number,"is_reversal": boolean,"material_id": string,"movement_type": Database["public"]['Enums']["movement_type"],"occurred_at": string,"project_delta": number,"project_id": string | null,"quantity": number,"total_cost": number,"unit_cost": number,"warehouse_delta": number,"warehouse_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by": string,"document_id": string,"employee_id"?: string | null,"id"?: never,"is_reversal"?: boolean,"material_id": string,"movement_type": Database["public"]['Enums']["movement_type"],"occurred_at": string,"project_delta": number,"project_id"?: string | null,"quantity": number,"total_cost": number,"unit_cost": number,"warehouse_delta": number,"warehouse_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string,"document_id"?: string,"employee_id"?: string | null,"id"?: never,"is_reversal"?: boolean,"material_id"?: string,"movement_type"?: Database["public"]['Enums']["movement_type"],"occurred_at"?: string,"project_delta"?: number,"project_id"?: string | null,"quantity"?: number,"total_cost"?: number,"unit_cost"?: number,"warehouse_delta"?: number,"warehouse_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "stock_movements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "inventory_documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "materials"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_material_id_fkey"
      columns: ["material_id"]
isOneToOne: false
      referencedRelation: "v_stock"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "stock_movements_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "stock_movements_warehouse_id_fkey"
      columns: ["warehouse_id"]
isOneToOne: false
      referencedRelation: "warehouses"
      referencedColumns: ["id"]
    }
                  ]
                },"suppliers": {
                  Row: {
                    "company_id": string,"contact_name": string | null,"created_at": string,"email": string | null,"id": string,"is_active": boolean,"name": string,"notes": string | null,"payment_terms_days": number | null,"phone": string | null,"tax_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"notes"?: string | null,"payment_terms_days"?: number | null,"phone"?: string | null,"tax_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"contact_name"?: string | null,"created_at"?: string,"email"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"notes"?: string | null,"payment_terms_days"?: number | null,"phone"?: string | null,"tax_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "suppliers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"tool_assignments": {
                  Row: {
                    "assigned_at": string,"assigned_by": string | null,"company_id": string,"condition_in": string | null,"condition_out": string | null,"employee_id": string,"id": string,"project_id": string | null,"returned_at": string | null,"returned_by": string | null,"tool_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"company_id"?: string,"condition_in"?: string | null,"condition_out"?: string | null,"employee_id": string,"id"?: string,"project_id"?: string | null,"returned_at"?: string | null,"returned_by"?: string | null,"tool_id": string
                  }
                  Update: {
                    "assigned_at"?: string,"assigned_by"?: string | null,"company_id"?: string,"condition_in"?: string | null,"condition_out"?: string | null,"employee_id"?: string,"id"?: string,"project_id"?: string | null,"returned_at"?: string | null,"returned_by"?: string | null,"tool_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tool_assignments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tool_assignments_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tool_assignments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tool_assignments_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "tool_assignments_tool_id_fkey"
      columns: ["tool_id"]
isOneToOne: false
      referencedRelation: "tools"
      referencedColumns: ["id"]
    }
                  ]
                },"tools": {
                  Row: {
                    "brand": string | null,"code": string,"company_id": string,"created_at": string,"id": string,"location": string | null,"model": string | null,"name": string,"notes": string | null,"purchased_on": string | null,"serial_number": string | null,"status": Database["public"]['Enums']["tool_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "brand"?: string | null,"code": string,"company_id"?: string,"created_at"?: string,"id"?: string,"location"?: string | null,"model"?: string | null,"name": string,"notes"?: string | null,"purchased_on"?: string | null,"serial_number"?: string | null,"status"?: Database["public"]['Enums']["tool_status"]
                  }
                  Update: {
                    "brand"?: string | null,"code"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"location"?: string | null,"model"?: string | null,"name"?: string,"notes"?: string | null,"purchased_on"?: string | null,"serial_number"?: string | null,"status"?: Database["public"]['Enums']["tool_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "tools_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"trainings": {
                  Row: {
                    "company_id": string,"completed_on": string | null,"created_at": string,"employee_id": string,"expires_on": string | null,"hours": number | null,"id": string,"name": string,"provider": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"completed_on"?: string | null,"created_at"?: string,"employee_id": string,"expires_on"?: string | null,"hours"?: number | null,"id"?: string,"name": string,"provider"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"completed_on"?: string | null,"created_at"?: string,"employee_id"?: string,"expires_on"?: string | null,"hours"?: number | null,"id"?: string,"name"?: string,"provider"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "trainings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "trainings_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    }
                  ]
                },"units": {
                  Row: {
                    "allows_decimals": boolean,"code": string,"company_id": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allows_decimals"?: boolean,"code": string,"company_id"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "allows_decimals"?: boolean,"code"?: string,"company_id"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "units_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_assignments": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"employee_id": string,"end_date": string | null,"id": string,"start_date": string,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"employee_id": string,"end_date"?: string | null,"id"?: string,"start_date"?: string,"vehicle_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"employee_id"?: string,"end_date"?: string | null,"id"?: string,"start_date"?: string,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_assignments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_assignments_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_assignments_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicle_events": {
                  Row: {
                    "company_id": string,"cost": number | null,"created_at": string,"created_by": string | null,"description": string,"event_date": string,"id": string,"kind": Database["public"]['Enums']["vehicle_event_kind"],"odometer_km": number | null,"supplier_id": string | null,"vehicle_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id"?: string,"cost"?: number | null,"created_at"?: string,"created_by"?: string | null,"description": string,"event_date"?: string,"id"?: string,"kind": Database["public"]['Enums']["vehicle_event_kind"],"odometer_km"?: number | null,"supplier_id"?: string | null,"vehicle_id": string
                  }
                  Update: {
                    "company_id"?: string,"cost"?: number | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"event_date"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["vehicle_event_kind"],"odometer_km"?: number | null,"supplier_id"?: string | null,"vehicle_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicle_events_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_events_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vehicle_events_vehicle_id_fkey"
      columns: ["vehicle_id"]
isOneToOne: false
      referencedRelation: "vehicles"
      referencedColumns: ["id"]
    }
                  ]
                },"vehicles": {
                  Row: {
                    "acquired_on": string | null,"brand": string | null,"company_id": string,"created_at": string,"id": string,"insurance_company": string | null,"insurance_due": string | null,"insurance_policy": string | null,"itv_due": string | null,"model": string | null,"next_service_due": string | null,"notes": string | null,"odometer_km": number | null,"ownership": Database["public"]['Enums']["vehicle_ownership"],"plate": string,"status": Database["public"]['Enums']["vehicle_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acquired_on"?: string | null,"brand"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"insurance_company"?: string | null,"insurance_due"?: string | null,"insurance_policy"?: string | null,"itv_due"?: string | null,"model"?: string | null,"next_service_due"?: string | null,"notes"?: string | null,"odometer_km"?: number | null,"ownership"?: Database["public"]['Enums']["vehicle_ownership"],"plate": string,"status"?: Database["public"]['Enums']["vehicle_status"],"updated_at"?: string
                  }
                  Update: {
                    "acquired_on"?: string | null,"brand"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"insurance_company"?: string | null,"insurance_due"?: string | null,"insurance_policy"?: string | null,"itv_due"?: string | null,"model"?: string | null,"next_service_due"?: string | null,"notes"?: string | null,"odometer_km"?: number | null,"ownership"?: Database["public"]['Enums']["vehicle_ownership"],"plate"?: string,"status"?: Database["public"]['Enums']["vehicle_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vehicles_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"warehouses": {
                  Row: {
                    "address": string | null,"company_id": string,"created_at": string,"id": string,"is_default": boolean,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"is_default"?: boolean,"name": string
                  }
                  Update: {
                    "address"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"is_default"?: boolean,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "warehouses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"work_report_billing": {
                  Row: {
                    "amount": number | null,"company_id": string,"report_id": string,"updated_at": string,"updated_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount"?: number | null,"company_id"?: string,"report_id": string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Update: {
                    "amount"?: number | null,"company_id"?: string,"report_id"?: string,"updated_at"?: string,"updated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_report_billing_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_report_billing_report_id_fkey"
      columns: ["report_id"]
isOneToOne: true
      referencedRelation: "work_reports"
      referencedColumns: ["id"]
    }
                  ]
                },"work_report_lines": {
                  Row: {
                    "description": string,"end_time": string | null,"hours": number | null,"id": string,"position": number,"report_id": string,"start_time": string | null,"technician_name": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "description": string,"end_time"?: string | null,"hours"?: never,"id"?: string,"position"?: number,"report_id": string,"start_time"?: string | null,"technician_name"?: string | null
                  }
                  Update: {
                    "description"?: string,"end_time"?: string | null,"hours"?: never,"id"?: string,"position"?: number,"report_id"?: string,"start_time"?: string | null,"technician_name"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_report_lines_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "work_reports"
      referencedColumns: ["id"]
    }
                  ]
                },"work_reports": {
                  Row: {
                    "client_address": string | null,"client_city": string | null,"client_email": string | null,"client_legal_rep": string | null,"client_legal_rep_tax_id": string | null,"client_name": string | null,"client_phone": string | null,"client_postal_code": string | null,"client_province": string | null,"client_signature_path": string | null,"client_signer_name": string | null,"client_tax_id": string | null,"company_id": string,"company_signature_path": string | null,"created_at": string,"created_by": string | null,"employee_id": string | null,"id": string,"maintenance_type": string | null,"number": string | null,"observations": string | null,"project_id": string,"report_date": string,"signed_at": string | null,"site_address": string | null,"site_city": string | null,"site_contact": string | null,"site_name": string | null,"site_phone": string | null,"site_postal_code": string | null,"site_province": string | null,"status": Database["public"]['Enums']["work_report_status"],"submitted_at": string | null,"updated_at": string,"validated_at": string | null,"validated_by": string | null,"work_done": string | null,"work_types": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "client_address"?: string | null,"client_city"?: string | null,"client_email"?: string | null,"client_legal_rep"?: string | null,"client_legal_rep_tax_id"?: string | null,"client_name"?: string | null,"client_phone"?: string | null,"client_postal_code"?: string | null,"client_province"?: string | null,"client_signature_path"?: string | null,"client_signer_name"?: string | null,"client_tax_id"?: string | null,"company_id"?: string,"company_signature_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"employee_id"?: string | null,"id"?: string,"maintenance_type"?: string | null,"number"?: string | null,"observations"?: string | null,"project_id": string,"report_date"?: string,"signed_at"?: string | null,"site_address"?: string | null,"site_city"?: string | null,"site_contact"?: string | null,"site_name"?: string | null,"site_phone"?: string | null,"site_postal_code"?: string | null,"site_province"?: string | null,"status"?: Database["public"]['Enums']["work_report_status"],"submitted_at"?: string | null,"updated_at"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"work_done"?: string | null,"work_types"?: (string)[]
                  }
                  Update: {
                    "client_address"?: string | null,"client_city"?: string | null,"client_email"?: string | null,"client_legal_rep"?: string | null,"client_legal_rep_tax_id"?: string | null,"client_name"?: string | null,"client_phone"?: string | null,"client_postal_code"?: string | null,"client_province"?: string | null,"client_signature_path"?: string | null,"client_signer_name"?: string | null,"client_tax_id"?: string | null,"company_id"?: string,"company_signature_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"employee_id"?: string | null,"id"?: string,"maintenance_type"?: string | null,"number"?: string | null,"observations"?: string | null,"project_id"?: string,"report_date"?: string,"signed_at"?: string | null,"site_address"?: string | null,"site_city"?: string | null,"site_contact"?: string | null,"site_name"?: string | null,"site_phone"?: string | null,"site_postal_code"?: string | null,"site_province"?: string | null,"status"?: Database["public"]['Enums']["work_report_status"],"submitted_at"?: string | null,"updated_at"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"work_done"?: string | null,"work_types"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "work_reports_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_reports_employee_id_fkey"
      columns: ["employee_id"]
isOneToOne: false
      referencedRelation: "employees"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_reports_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "work_reports_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    }
                  ]
                }
          }
          Views: {
            "v_alerts": {
                  Row: {
                    "detail": string | null,"due_date": string | null,"kind": string | null,"link": string | null,"title": string | null,"tone": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_bank_balances": {
                  Row: {
                    "balance": number | null,"bank_balance_at": string | null,"bank_name": string | null,"iban": string | null,"id": string,"is_active": boolean,"name": string,"opening_balance": number,"opening_date": string,"sync_mode": string
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_invoices": {
                  Row: {
                    "base_amount": number,"client_id": string | null,"company_id": string,"concept": string | null,"created_at": string,"created_by": string | null,"days_overdue": number | null,"destination": Database["public"]['Enums']["invoice_destination"] | null,"direction": Database["public"]['Enums']["invoice_direction"],"due_date": string | null,"external_ref": string | null,"guarantee_amount": number,"guarantee_release_date": string | null,"id": string,"irpf_amount": number,"issue_date": string,"notes": string | null,"number": string,"outstanding_amount": number | null,"paid_amount": number | null,"party_name": string | null,"pdf_path": string | null,"project_code": string | null,"project_id": string | null,"project_name": string | null,"status": string | null,"supplier_id": string | null,"total_amount": number | null,"updated_at": string,"vat_amount": number,"vat_regime": Database["public"]['Enums']["vat_regime"],"void_reason": string | null,"voided_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "invoices_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invoices_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "invoices_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"v_project_financials": {
                  Row: {
                    "budget_amount": number | null,"certified_amount": number | null,"client_id": string | null,"code": string,"collected_amount": number | null,"estimated_cost": number | null,"invoiced_base": number | null,"invoiced_total": number | null,"labor_cost": number | null,"material_cost": number | null,"name": string,"other_expenses": number | null,"project_id": string,"status": Database["public"]['Enums']["project_status"],"supplier_invoices_cost": number | null
                  }
                  ComputedFields: never
                  Insert: {
                           "budget_amount"?: never,"certified_amount"?: never,"client_id"?: string | null,"code"?: string | null,"collected_amount"?: never,"estimated_cost"?: never,"invoiced_base"?: never,"invoiced_total"?: never,"labor_cost"?: never,"material_cost"?: never,"name"?: string | null,"other_expenses"?: never,"project_id"?: string | null,"status"?: Database["public"]['Enums']["project_status"] | null,"supplier_invoices_cost"?: never
                         }
                        Update: {
                           "budget_amount"?: never,"certified_amount"?: never,"client_id"?: string | null,"code"?: string | null,"collected_amount"?: never,"estimated_cost"?: never,"invoiced_base"?: never,"invoiced_total"?: never,"labor_cost"?: never,"material_cost"?: never,"name"?: string | null,"other_expenses"?: never,"project_id"?: string | null,"status"?: Database["public"]['Enums']["project_status"] | null,"supplier_invoices_cost"?: never
                         }
                        Relationships: [
                    {
      foreignKeyName: "projects_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    }
                  ]
                },"v_recent_activity": {
                  Row: {
                    "at": string | null,"kind": string | null,"link": string | null,"summary": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_stock": {
                  Row: {
                    "avg_unit_cost": number | null,"brand": string | null,"category_id": string | null,"category_name": string | null,"code": string,"default_supplier_id": string | null,"id": string,"is_low": boolean | null,"last_movement_at": string | null,"location": string | null,"min_stock": number,"model_ref": string | null,"name": string,"quantity": number | null,"status": Database["public"]['Enums']["material_status"],"stock_value": number | null,"supplier_name": string | null,"unit_code": string,"unit_name": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "materials_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "material_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "materials_default_supplier_id_fkey"
      columns: ["default_supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                },"v_transactions_reconciliation": {
                  Row: {
                    "account_id": string,"account_name": string,"amount": number,"bank_details": string | null,"category": string | null,"client_id": string | null,"company_id": string,"counterparty_name": string | null,"created_at": string,"created_by": string | null,"description": string,"external_id": string | null,"id": string,"kind": Database["public"]['Enums']["transaction_kind"],"linked_amount": number | null,"project_id": string | null,"source": string,"status": Database["public"]['Enums']["transaction_status"],"supplier_id": string | null,"transfer_group": string | null,"tx_date": string,"unlinked_amount": number | null,"value_date": string | null,"void_reason": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "financial_transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "bank_accounts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_account_id_fkey"
      columns: ["account_id"]
isOneToOne: false
      referencedRelation: "v_bank_balances"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "financial_transactions_project_id_fkey"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "v_project_financials"
      referencedColumns: ["project_id"]
    },{
      foreignKeyName: "financial_transactions_supplier_id_fkey"
      columns: ["supplier_id"]
isOneToOne: false
      referencedRelation: "suppliers"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "audit_recent":
{ Args: { "p_limit"?: number,"p_table"?: string }; Returns: {
              "action": string,"actor": string,"changes": Json,"occurred_at": string,"record_id": string,"table_name": string
            }[]
                           },
"bank_transfer":
{ Args: { "p_amount": number,"p_date": string,"p_description": string,"p_from": string,"p_to": string }; Returns: string
                           },
"cash_forecast":
{ Args: { "p_days"?: number }; Returns: {
              "amount": number,"concept": string,"due_date": string,"is_estimate": boolean,"source": string
            }[]
                           },
"document_lines":
{ Args: { "p_document": string }; Returns: {
              "code": string,"is_reversal": boolean,"material_id": string,"movement_type": Database["public"]['Enums']["movement_type"],"name": string,"quantity": number,"unit_code": string
            }[]
                           },
"inv_adjust":
{ Args: { "p_justification": string,"p_material": string,"p_quantity": number,"p_reason": string,"p_unit_cost"?: number }; Returns: string
                           },
"inv_confirm_reception":
{ Args: { "p_document": string }; Returns: undefined
                           },
"inv_issue":
{ Args: { "p_employee"?: string,"p_lines": Json,"p_notes"?: string,"p_project": string,"p_request"?: string }; Returns: string
                           },
"inv_purchase":
{ Args: { "p_date"?: string,"p_lines": Json,"p_notes"?: string,"p_reference": string,"p_supplier": string }; Returns: string
                           },
"inv_return":
{ Args: { "p_employee"?: string,"p_lines": Json,"p_notes"?: string,"p_project": string }; Returns: string
                           },
"inv_reverse":
{ Args: { "p_document": string,"p_reason": string }; Returns: string
                           },
"inv_verify_balances":
{ Args: Record<PropertyKey, never>; Returns: {
              "balance": number,"material_id": string,"movements_sum": number
            }[]
                           },
"invoice_link_transaction":
{ Args: { "p_amount"?: number,"p_invoice": string,"p_transaction": string }; Returns: string
                           },
"invoice_register_payment":
{ Args: { "p_account": string,"p_amount": number,"p_date": string,"p_invoice": string,"p_notes"?: string }; Returns: string
                           },
"invoice_unlink_payment":
{ Args: { "p_payment": string }; Returns: undefined
                           },
"materials_search":
{ Args: { "p_limit"?: number,"p_query"?: string }; Returns: {
              "allows_decimals": boolean,"available": number,"brand": string,"category_name": string,"code": string,"id": string,"model_ref": string,"name": string,"unit_code": string
            }[]
                           },
"my_context":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"my_project_materials":
{ Args: { "p_project": string }; Returns: {
              "allows_decimals": boolean,"code": string,"material_id": string,"name": string,"net_quantity": number,"unit_code": string
            }[]
                           },
"request_create":
{ Args: { "p_employee"?: string,"p_items": Json,"p_needed_by"?: string,"p_notes"?: string,"p_priority"?: Database["public"]['Enums']["request_priority"],"p_project": string }; Returns: string
                           },
"request_set_status":
{ Args: { "p_approved"?: Json,"p_reason"?: string,"p_request": string,"p_status": Database["public"]['Enums']["request_status"] }; Returns: undefined
                           },
"tool_assign":
{ Args: { "p_condition"?: string,"p_employee": string,"p_project"?: string,"p_tool": string }; Returns: string
                           },
"tool_return":
{ Args: { "p_condition"?: string,"p_status"?: Database["public"]['Enums']["tool_status"],"p_tool": string }; Returns: undefined
                           },
"work_report_prefill":
{ Args: { "p_project": string }; Returns: Json
                           },
"work_report_save":
{ Args: { "p_lines": Json,"p_report": Json,"p_status"?: Database["public"]['Enums']["work_report_status"] }; Returns: string
                           },
"worker_join_project":
{ Args: { "p_project": string }; Returns: undefined
                           },
"worker_leave_project":
{ Args: { "p_project": string }; Returns: undefined
                           },
"worker_set_vehicle":
{ Args: { "p_vehicle": string }; Returns: undefined
                           }
          }
          Enums: {
            "absence_kind": "vacation"|"personal"|"paid_leave"|"sick_leave"|"other","absence_status": "requested"|"approved"|"rejected","app_role": "admin"|"worker","bank_connection_status": "pending"|"active"|"expired"|"error"|"revoked","budget_kind": "initial"|"additional"|"certification","client_kind": "company"|"individual"|"community"|"public","commitment_kind": "rent"|"insurance"|"phone"|"software"|"renting"|"utilities"|"payroll"|"social_security"|"taxes"|"other","cost_category": "material"|"labor"|"subcontract"|"travel"|"rental"|"other","document_category": "contract"|"budget"|"certification"|"delivery_note"|"invoice"|"plan"|"photo"|"work_report"|"id_document"|"medical_fitness"|"training"|"prl"|"site_access"|"ppe"|"vehicle"|"insurance"|"company"|"other","employee_status": "active"|"leave"|"inactive","frequency": "monthly"|"quarterly"|"yearly","incident_severity": "low"|"medium"|"high","incident_status": "open"|"in_progress"|"resolved","inventory_kind": "purchase"|"issue"|"return"|"adjustment"|"reversal","invoice_destination": "project"|"stock"|"overhead","invoice_direction": "issued"|"received","loan_kind": "loan"|"credit_line"|"leasing"|"other","material_status": "active"|"discontinued","movement_type": "purchase_in"|"issue_out"|"return_in"|"return_damaged"|"adjust_in"|"adjust_out","project_status": "budgeted"|"pending_approval"|"approved"|"preparation"|"in_progress"|"paused"|"finished"|"closed","request_priority": "low"|"normal"|"high"|"urgent","request_status": "pending"|"in_review"|"approved"|"prepared"|"delivered"|"rejected"|"cancelled","tool_status": "available"|"assigned"|"repair"|"lost"|"retired","transaction_kind": "income"|"expense"|"transfer"|"fee"|"other","transaction_status": "confirmed"|"void","vat_regime": "general"|"reverse_charge"|"exempt","vehicle_event_kind": "maintenance"|"breakdown"|"repair"|"inspection"|"itv"|"other","vehicle_ownership": "owned"|"renting"|"leasing","vehicle_status": "active"|"workshop"|"inactive","work_report_status": "draft"|"submitted"|"validated"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "absence_kind": ["vacation", "personal", "paid_leave", "sick_leave", "other"],"absence_status": ["requested", "approved", "rejected"],"app_role": ["admin", "worker"],"bank_connection_status": ["pending", "active", "expired", "error", "revoked"],"budget_kind": ["initial", "additional", "certification"],"client_kind": ["company", "individual", "community", "public"],"commitment_kind": ["rent", "insurance", "phone", "software", "renting", "utilities", "payroll", "social_security", "taxes", "other"],"cost_category": ["material", "labor", "subcontract", "travel", "rental", "other"],"document_category": ["contract", "budget", "certification", "delivery_note", "invoice", "plan", "photo", "work_report", "id_document", "medical_fitness", "training", "prl", "site_access", "ppe", "vehicle", "insurance", "company", "other"],"employee_status": ["active", "leave", "inactive"],"frequency": ["monthly", "quarterly", "yearly"],"incident_severity": ["low", "medium", "high"],"incident_status": ["open", "in_progress", "resolved"],"inventory_kind": ["purchase", "issue", "return", "adjustment", "reversal"],"invoice_destination": ["project", "stock", "overhead"],"invoice_direction": ["issued", "received"],"loan_kind": ["loan", "credit_line", "leasing", "other"],"material_status": ["active", "discontinued"],"movement_type": ["purchase_in", "issue_out", "return_in", "return_damaged", "adjust_in", "adjust_out"],"project_status": ["budgeted", "pending_approval", "approved", "preparation", "in_progress", "paused", "finished", "closed"],"request_priority": ["low", "normal", "high", "urgent"],"request_status": ["pending", "in_review", "approved", "prepared", "delivered", "rejected", "cancelled"],"tool_status": ["available", "assigned", "repair", "lost", "retired"],"transaction_kind": ["income", "expense", "transfer", "fee", "other"],"transaction_status": ["confirmed", "void"],"vat_regime": ["general", "reverse_charge", "exempt"],"vehicle_event_kind": ["maintenance", "breakdown", "repair", "inspection", "itv", "other"],"vehicle_ownership": ["owned", "renting", "leasing"],"vehicle_status": ["active", "workshop", "inactive"],"work_report_status": ["draft", "submitted", "validated"]
          }
        }
} as const
