import type {
  LoginSO,
  LoginRO,
  UpdatePasswordRO,
  User,
  CreateUserRO,
  UpdateUserRoleRO
} from '@/types/pusher/user'
import { HttpMethod } from '@/utils/enums'
import { http } from '@/utils/request'

export function userLoginApi(LoginRO: LoginRO) {
  return http<LoginSO>({
    url: '/User/Login',
    method: HttpMethod.POST,
    data: LoginRO
  })
}

export function userRefreshTokenApi() {
  return http<LoginSO>({
    url: '/User/RefreshToken',
    method: HttpMethod.GET
  })
}

export function userUpdatePasswordApi(updatePasswordRO: UpdatePasswordRO) {
  return http<string>({
    url: '/User/UpdatePassword',
    method: HttpMethod.POST,
    data: updatePasswordRO
  })
}

export function userGetPasswordApi(username: string) {
  return http<string>({
    url: '/User/GetPassword',
    method: HttpMethod.GET,
    params: { username }
  })
}
