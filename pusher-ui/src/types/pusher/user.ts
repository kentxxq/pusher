export interface LoginRO {
  username: string
  password: string
}

export interface LoginSO {
  token: string
}

export interface UpdatePasswordRO {
  oldPassword: string
  newPassword: string
}

export enum RoleType {
  Free,
  VIP,
  Admin
}

export interface User {
  id: number
  username: string
  password: string
  roleType: RoleType
  lastForgetTime?: Date | null
  lastLoginTime?: Date | null
}

export interface CreateUserRO {
  username: string
  password: string
  roleType: RoleType
}

export interface UpdateUserRoleRO {
  username: string
  roleType: RoleType
}
