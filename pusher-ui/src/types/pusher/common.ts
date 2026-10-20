export enum ResultStatus {
  Success = 20000,
  Error = 50000
}

export interface ResultModel<T> {
  /** 统一返回模型的枚举code */
  code: ResultStatus
  /** 简要消息 */
  message: string
  /** 数据 */
  data: T
}

export interface PageDataModel<T> {
  pageIndex: number
  pageSize: number
  totalCount: number
  pageData: Array<T>
}

export interface JwtStruct {
  sub: string
  aud: string
  exp: number
  iat: number
  iss: string
  nbf: number
  id: number
  name: string
  role: Array<string>
}

export interface EnumObject {
  enumKey: number
  enumName: string
  enumDisplayName: string
}
