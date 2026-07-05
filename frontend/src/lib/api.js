import qs from "qs"
import { access_token, username, is_login } from "./store"
import { get } from "svelte/store"
import { push } from "svelte-spa-router"

const fastapi = (operation, url, params, success_callback, failure_callback) => {
    let method = operation.toLowerCase() // 대소문자 방지
    let content_type = 'application/json'
    let body = JSON.stringify(params)

    if(operation === 'login') {
        method = 'post'
        content_type = 'application/x-www-form-urlencoded'
        body = qs.stringify(params)
    }

    let _url = url.startsWith('/') ? url : '/' + url;
    
    // 🛠️ 수정 포인트 1: 'get'뿐만 아니라 'delete' 메서드도 주소창 파라미터(?key=value)를 사용하도록 변경
    if(method === 'get' || method === 'delete') {
        // 빈 객체({})가 들어오면 주소창 뒤에 무의미한 '?'가 붙지 않도록 방어 코드 작성
        if (params && Object.keys(params).length > 0) {
            _url += "?" + new URLSearchParams(params)
        }
    }

    let options = {
        method: method,
        headers: {
            "Content-Type": content_type
        }
    }

    const _access_token = get(access_token)
    if (_access_token) {
        options.headers["Authorization"] = "Bearer " + _access_token
    }

    // 🛠️ 수정 포인트 2: 'get'과 'delete'가 아닐 때만(post, put 등) 바디 데이터를 동봉합니다.
    if (method !== 'get' && method !== 'delete') {
        options['body'] = body
    }

    fetch(_url, options)
        .then(response => {
            // 백엔드가 204 No Content를 주면 데이터가 비어있으므로 response.json()을 실행하지 않고 즉시 성공 콜백 호출
            if(response.status === 204) {  
                if(success_callback) {
                    success_callback()
                }
                return
            }
            
            // 204가 아닐 때만 json 파싱 수행
            response.json()
                .then(json => {
                    if(response.status >= 200 && response.status < 300) {  // 200 ~ 299
                        if(success_callback) {
                            success_callback(json)
                        }
                    } else if(operation !== 'login' && response.status === 401) {
                        // 토큰 만료 처리
                        access_token.set('')
                        username.set('')
                        is_login.set(false)
                        alert("로그인이 필요합니다.")
                        push('/user-login')
                    } else {
                        if (failure_callback) {
                            failure_callback(json)
                        } else {
                            alert(JSON.stringify(json))
                        }
                    }
                })
                .catch(error => {
                    alert(JSON.stringify(error))
                })
        })
}

export default fastapi