import { bot } from '../lib/cmds.js';
import { getChatSummary, getGroupMembersMessageCount, getGroupMetadata, getInactiveGroupMembers } from '../sql/store.js';

bot(
	{
		pattern: 'getchats',
		isPublic: false,
		desc: 'Get chats summary',
	},
	async (message, match, { prefix }) => {
		if (!match) return message.send(`Usage: ${prefix}getchats dm/gc`);

		const chatType = match.trim();
		const allChats = await getChatSummary();

		const filteredChats = chatType === 'dm' ? allChats.filter(chat => !chat.jid.endsWith('@g.us') && !chat.jid.endsWith('@newsletter')) && !chat.jid === 'status@broadcast' : allChats.filter(chat => chat.jid.endsWith('@g.us'));

		if (filteredChats.length === 0) return message.send(`No ${chatType === 'dm' ? 'direct messages' : 'group chats'} found.`);

		const mentionJids = filteredChats.filter(chat => chatType === 'dm').map(chat => chat.jid);

		const formattedChats =
			chatType === 'dm'
				? filteredChats.map((chat, index) => `${index + 1}. FROM: @${chat.jid.split('@')[0]}\nMessages: ${chat.messageCount}\nLast Message: ${new Date(chat.lastMessageTimestamp).toLocaleString()}`)
				: await Promise.all(
						filteredChats.map(async (chat, index) => {
							try {
								const groupMetadata = await getGroupMetadata(chat.jid);
								return `GROUP: ${groupMetadata?.subject || 'Unknown Group'}\nMessages: ${chat.messageCount}\nLast Message: ${new Date(chat.lastMessageTimestamp).toLocaleString()}`;
							} catch (error) {
								return `GROUP: Unknown Group\nMessages: ${chat.messageCount}\nLast Message: ${new Date(chat.lastMessageTimestamp).toLocaleString()}`;
							}
						}),
				  );

		message.send(`\`\`\`${chatType.toUpperCase()} Chats:\n\n${formattedChats.join('\n\n')}\`\`\``, { mentions: mentionJids });
	},
);

bot(
	{
		pattern: 'gactive',
		isPublic: true,
		isGroup: true,
		desc: 'Return the Active Group Members from when the bot started running',
	},
	async message => {
		const groupData = await getGroupMembersMessageCount(message.jid);
		if (groupData.length === 0) return await message.send('No active members found.');
		let responseMessage = '🏆 Most Active Group Members\n\n';
		groupData.forEach((member, index) => {
			responseMessage += `${index + 1}. ${member.name}\n`;
			responseMessage += `   • Messages: ${member.messageCount}\n`;
		});

		await message.send(`\`\`\`${responseMessage}\`\`\``);
	},
);

bot(
	{
		pattern: 'inactive',
		isPublic: true,
		isGroup: true,
		desc: 'Get the inactive group members from a group',
	},
	async message => {
		const groupData = await getInactiveGroupMembers(message.jid);
		if (groupData.length === 0) return await message.reply('*📊 Inactive Members:* No inactive members found.');
		let responseMessage = '📊 Inactive Members:\n\n';
		responseMessage += `Total Inactive: ${groupData.length}\n\n`;
		groupData.forEach((jid, index) => {
			responseMessage += `${index + 1}. @${jid.split('@')[0]}\n`;
		});
		await message.send(`\`\`\`${responseMessage}\`\`\``, { mentions: groupData });
	},
);
