import { defineStore } from 'pinia'
import { userLoginApi, userRefreshTokenApi } from '@/api/user'
import type { JwtStruct } from '@/types/pusher/common'
import { jwtDecode } from 'jwt-decode'
import type { LoginRO } from '@/types/pusher/user'

export interface UserInfo {
  username: string
  token: string
  roles: Array<string>
}

const state: UserInfo = { username: '', token: '', roles: [] }

export const useUserStore = defineStore('user', {
  state: () => state,
  getters: {
    isTokenValid(state): boolean {
      try {
        const jwt = jwtDecode<JwtStruct>(state.token)
        const now = Date.now() / 1000
        console.debug('当前时间', now)
        if (now > jwt.exp) {
          console.debug('已过期')
        }
        if (
          state.token !== null &&
          state.token !== '' &&
          state.token !== undefined &&
          now < jwt.exp
        ) {
          return true
        }
        return false
      } catch {
        return false
      }
    }
  },
  actions: {
    async userLogin(loginRO: LoginRO): Promise<boolean> {
      const result = await userLoginApi(loginRO)
      // 存储必要状态
      this.token = result.token
      const jwt = jwtDecode<JwtStruct>(result.token)
      this.username = jwt.name
      this.roles = jwt.role
      console.debug('userLogin返回的token', jwt)
      return true
    },
    async refreshToken() {
      const result = await userRefreshTokenApi()
      // 存储必要状态
      this.token = result.token
      const jwt = jwtDecode<JwtStruct>(result.token)
      this.username = jwt.name
      this.roles = jwt.role
      console.debug('userRefreshToken返回的token', jwt)
      return true
    },
    needRefreshToken() {
      const jwt = jwtDecode<JwtStruct>(this.token)
      const now = Date.now()
      // 1小时
      const exp = 1000 * 60 * 60
      // console.debug(jwt.exp * 1000, now, exp)
      return jwt.exp * 1000 - now < exp
    },
    resetUser() {
      this.username = ''
      this.token = ''
      this.roles = []
    },
    loginOut() {
      this.resetUser()
    }
  }
})
