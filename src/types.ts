export type Employee = { id: string; name: string }
export type Case = { order_number: string; order_amount: string; personal_consultant: string; client_name: string; segment: string; phone: string; situation: string }
export type Factor = { type: 'growth' | 'negative'; description: string; suggested_by: string }
export type Reward = { employee_name: string; reward_reason: string; reward_date: string; penalty_reason: string; penalty_date: string }
export type Report = { id?: string; leader_id: string; leader_name: string; report_month: string; cases: Case[]; factors: Factor[]; rewards: Reward[]; created_at?: string; updated_at?: string }
