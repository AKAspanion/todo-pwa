import FirebaseWeb from "../firebase";
const firebase = new FirebaseWeb();

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

export const deleteNotifications = (notificationId, notifications) => {
	return new Promise(resolve => {
		let updatedNotifications = [];
		for (let i = 0; i < notifications.length; i++) {
			let currentNotification = notifications[i];
			if (currentNotification.id !== notificationId) {
				updatedNotifications.push({
					...currentNotification
				});
			}
		}
		resolve(updatedNotifications);
	})
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