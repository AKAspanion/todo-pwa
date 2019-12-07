import router from "../router/router"

import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

export const navigateToPath = (path) => {
    router.push({
            path
        })
        .catch(err => {})
}

export const getRandomHexColor = () => {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

export const getTextColorByBg = (color) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    let rgb = result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
    if (rgb) {
        let ratio = Math.round(((parseInt(rgb.r) * 299) + (parseInt(rgb.g) * 587) + (parseInt(rgb.b) * 114)) / 1000)
        if (ratio > 128) {
            return '#333333'
        } else {
            return '#ffffff'
        }
    } else {
        return '#ffffff'
    }
}

export const getInitials = (name) => {
    let initials = name.match(/\b\w/g) || [];
    return ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
}

export const getAllNotificationsForUser = (user) => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchAllNotificationByUID(user)
            .then(snapshot => {
                return parseAllNotification(snapshot);
            })
            .then(notification => {
                resolve(notification);
            })
            .catch((err) => {
                console.log(err);
                reject("Error getting tasks. Please try later!")
            })
    })
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
            .catch((err) => {
                console.log(err);
                reject("Error getting tasks. Please try later!")
            })
    })
}

export const getAllTaskTypesForUser = (user) => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchAllTaskTypeByUID(user)
            .then(snapshot => {
                return parseAllTypes(snapshot);
            })
            .then(types => {
                resolve(types);
            })
            .catch((err) => {
                console.log(err);
                reject("Error getting task types. Please try later!")
            })
    })
}

export const getTasksByStatus = (tasks) => {
    return (
        tasks.reduce((taskByStatus, task) => {
            taskByStatus[task.status] =
                taskByStatus[task.status] || [];
            taskByStatus[task.status].push(task);
            return taskByStatus;
        }, {
            todo: [],
            done: []
        }))
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

const parseAllNotification = (snapshot) => {
    return new Promise((resolve) => {
        let notification = [];
        snapshot.forEach(doc => {
            notification.push({
                id: doc.id,
                ...doc.data(),
            });
        });
        resolve(notification);
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