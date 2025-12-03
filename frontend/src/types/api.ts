export interface UphAnalys {
  serial_number: number
  model_type: string
  lineName?: string
  lineModel?: string
  date_record: string
  diff_cnt_8_10: number
  diff_cnt_10_12: number
  diff_cnt_12_14: number
  diff_cnt_14_16: number
  diff_cnt_16_18: number
  diff_cnt_18_20: number
  diff_cnt_20_22: number
  diff_cnt_22_24: number
  diff_cnt_24_2: number
  diff_cnt_2_4: number
  diff_cnt_4_6: number
  diff_cnt_6_8: number
}

export interface UphItem {
  id: number
  line_leader_item?: string
  pie_item?: string
  qc_item?: string
  line_name?: string
  pie_name?: string
  qc_name?: string
}

export interface AnalysesListRes {
  items: UphAnalys[]
  page: number
  size: number
  total: number
}

export interface AnalysesDetailRes {
  analys?: UphAnalys
  item?: UphItem
}

export interface PatchBody {
  line_leader_item?: string
  pie_item?: string
  qc_item?: string
}
