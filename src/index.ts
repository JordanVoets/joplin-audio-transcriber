import joplin from 'api';

joplin.plugins.register({
	onStart: async function() {
		console.info('Joplin Audio Transcriber plugin started!');
	},
});
