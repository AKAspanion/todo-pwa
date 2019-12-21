import router from "../router/router"

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