import { getPartyMembers } from "../services/party.cjs";
import { removePlayer } from "../services/players.cjs";

async function leaveQueue({playerId}){
    try{
        let party = await getPartyMembers({playerId})
        if (!party.status) return {status: false, msg: 'unable to fetch'}

        await removePlayer({group: party.data})
        return {status: true, msg: 'removed from queue'}
    } catch(e) {
        throw e
    }
}

export {
    leaveQueue
}