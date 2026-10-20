import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { type ResultModel, ResultStatus } from '@/types/pusher/common'
import { useUserStore } from '@/stores'
import { ElMessage } from 'element-plus'
import router from '@/router/index'

// 创建实例
const axiosInstance = axios.create({
  // 默认是 /
  baseURL: import.meta.env.VITE_SERVER,
  // 超时5秒
  timeout: 5000
})

// 拦截器
axiosInstance.interceptors.request.use((config) => {
  const userStore = useUserStore()
  if (userStore.isTokenValid) {
    console.debug('request拦截器-添加token校验')
    config.headers.Authorization = `Bearer ${userStore.token}`
    console.debug('request拦截器', config)
    return config
  } else {
    // token无效:注销用户,返回登录页
    console.debug('request拦截器-token过期')
    userStore.loginOut()
    router.push('/login')
    return config
  }
})

axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ResultModel<any>>) => {
    console.debug('response拦截器-成功', response)
    if (response.data.code !== ResultStatus.Success) {
      if (response.data.data === 401) {
        ElMessage({
          message: `token 失效，请重新登录`,
          type: 'error'
        })
        const userStore = useUserStore()
        userStore.loginOut()
        router.push('/login')
        return
      }

      if (response.data.data === 403) {
        ElMessage({
          message: `没有权限执行操作,请联系管理员`,
          type: 'error'
        })
      } else {
        ElMessage({
          message: `请求报错:${response.data.message}`,
          type: 'error'
        })
      }

      return Promise.reject(new Error(response.data.message))
    }

    return response.data.data
  },
  (error: AxiosError) => {
    console.debug('response拦截器-失败', error)
    ElMessage({
      message: `请求报错: ${error.message}`,
      type: 'error'
    })
    return Promise.reject(error)
  }
)

// 因为我们在拦截器对数据做了拆解. 所以这里封装一下,修正ts的返回类型
function http<T>(config: AxiosRequestConfig): Promise<T> {
  return axiosInstance(config)
}

export { http }
