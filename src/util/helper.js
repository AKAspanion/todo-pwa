import router from "../router/router"

import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

export const navigateToPath = (path) => {
    router.push({
            path
        })
        .catch(err => {})
}

export const getInitials = (name) => {
    let initials = name.match(/\b\w/g) || [];
    return ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
}

export const getAllTasksForUser = (user) => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchTasksByUID(user)
            .then(snapshot => {
                return parseAllTasks(snapshot);
            })
            .then(tasks => {
                resolve(tasks);
            })
            .catch(() => {
                reject("Error getting tasks. Please try later!")
            })
    })
}

export const getAllTaskTypes = () => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchAllTaskType()
            .then(snapshot => {
                return parseAllTypes(snapshot);
            })
            .then(types => {
                resolve(types);
            })
            .catch(() => {
                reject("Error getting task types. Please try later!")
            })
    })
}

export const parseTasksByStatus = (tasks) => {
    return new Promise(resolve => {
        resolve(
            tasks.reduce((taskByStatus, task) => {
                taskByStatus[task.status] =
                    taskByStatus[task.status] || [];
                taskByStatus[task.status].push(task);
                return taskByStatus;
            }, {})
        );
    });
}

export const updateTasks = (taskId, updatedTask, tasks) => {
    return new Promise(resolve => {
        let updatedTaskList = [];
        for (let i = 0; i < tasks.length; i++) {
            let currentTask = tasks[i];
            if (currentTask.id === taskId) {
                updatedTaskList.push({
                    ...currentTask,
                    ...updatedTask
                });
            } else {
                updatedTaskList.push({
                    ...currentTask
                });
            }
        }
        resolve(updatedTaskList);
    });
}

export const deleteTasks = (taskId, tasks) => {
    return new Promise(resolve => {
        let updatedTaskList = [];
        for (let i = 0; i < tasks.length; i++) {
            let currentTask = tasks[i];
            if (currentTask.id !== taskId) {
                updatedTaskList.push({
                    ...currentTask
                });
            }
        }
        resolve(updatedTaskList);
    });
}

const parseAllTypes = (snapshot) => {
    return new Promise((resolve) => {
        let types = [];
        snapshot.forEach(doc => {
            types.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        resolve(types);
    });
}

const parseAllTasks = (snapshot) => {
    return new Promise((resolve) => {
        let tasks = [];
        snapshot.forEach(doc => {
            let task = doc.data();
            let typeArray = [];
            if (task.type.length) {
                task.type.forEach(type => {
                    type.get()
                        .then(res => {
                            typeArray.push({
                                id: res.id,
                                ...res.data()
                            })
                        })
                })
            }
            tasks.push({
                id: doc.id,
                ...doc.data(),
                type: typeArray
            });
        });
        resolve(tasks);
    });
}