import router from "../router/router"

export const navigateToPath = (path) => {
    router.push({
        path
    });
}