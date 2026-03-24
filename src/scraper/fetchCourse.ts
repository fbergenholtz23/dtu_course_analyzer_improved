import axios from 'axios'

export async function fetchCourse(courseNumber: string, cookie: string): Promise<string> {
    const url = `https://kurser.dtu.dk/course/${courseNumber}/info`
    const response = await axios.get<string>(url, {
        headers: {
            Cookie: `ASP.NET_SessionId=${cookie}`
        }
    })
    return response.data
}

export async function fetchUrl(url: string, cookie: string): Promise<string> {
    const response = await axios.get<string>(url, {
        headers: {
            Cookie: `ASP.NET_SessionId=${cookie}`
        }
    })
    return response.data
}