var rooms = []
var rankings = {}

const n = 4 // multiplayer count

const mainsocket = (io) => {
    return io.on("connection", (client) => {
        client.roomName = null
        client.username = ""
        
        client.on('join', () => {
            if (rooms.length > 0 && rooms[rooms.length - 1].count < n && rooms[rooms.length - 1].active == false) {
                client.join(rooms[rooms.length - 1].roomId)
                rooms[rooms.length - 1].count++
                client.roomName = rooms[rooms.length - 1].roomId
                client.emit('getOpponents', {opponents: rankings[client.roomName]})

                rankings[client.roomName].push({name: client.username, rank: rooms[rooms.length - 1].count, progress: 0, socket_id: client.id})
                rankings[client.roomName].sort((a, b) => {return a.rank - b.rank})
                io.sockets.in(client.roomName).emit('updateLeaderboard', {rankings: rankings[client.roomName]})
                client.emit('spawnPosition', {position: rooms[rooms.length - 1].count})
                client.broadcast.to(client.roomName).emit('newOpponent', {opponent: rankings[client.roomName][rankings[client.roomName].length - 1]})

                setTimeout(() => {
                    if (rooms[rooms.length - 1].count == n) {
                        io.sockets.in(client.roomName).emit('play', {})
                        rooms[rooms.length - 1].active = true
                    }

                }, 1000);
            }
            else {
                const roomId = Math.random().toString(32).slice(2,8)
                client.join(roomId)
                rooms.push({roomId: roomId, count: 1, active: false})
                client.roomName = rooms[rooms.length - 1].roomId

                rankings[client.roomName] = Array()
                rankings[client.roomName].push({name: client.username, rank: 1, progress: 0, socket_id: client.id})
                
                io.sockets.in(client.roomName).emit('updateLeaderboard', {rankings: rankings[client.roomName]})
                client.emit('spawnPosition', {position: 1})
                rankings[client.roomName].sort((a, b) => {return a.rank - b.rank})
            }
        })
        
        client.on('disconnect', () => {
            var index = null;
            rooms.forEach((room, idx) => {
                if (room.roomId === client.roomName) {
                    room.count--
                    if (room.count === 0) {
                        index = idx
                    }
                }
            })
            
            if (index !== null) {
                rooms.splice(index, 1)
            }

            index = null;
            var decrement = false;
            
            if (rankings[client.roomName] !== undefined) {
                rankings[client.roomName].forEach((player, idx) => {
                    if (decrement) {
                        player.rank = player.rank - 1
                    }
                    if (player.name === client.username) {
                        index = idx
                        decrement = true
                    }
                })
                
                if (index !== null) {
                    rankings[client.roomName].splice(index, 1)
                    rankings[client.roomName].sort((a, b) => {return a.rank - b.rank})
                    io.sockets.in(client.roomName).emit('updateLeaderboard', {rankings: rankings[client.roomName]})
                }
    
                if (rankings[client.roomName].length === 0) {
                    delete rankings[client.roomName]
                }
            }

            client.broadcast.to(client.roomName).emit('opponentDisconnect', {socket_id: client.id})
        })

        client.on('username', ({username}) => {
            if (username == "" || username == undefined)
            username = client.id.slice(0, 6)
            if (username.length > 16) {
                username = username.slice(0, 16)
            }
            client.username = username
            client.emit('setUsername', {username: client.username})
        })

        client.on('progress', ({progress}) => {
            if (rankings[client.roomName] !== undefined) {
                rankings[client.roomName].forEach((player) => {
                    if (player.name == client.username) {
                        player.progress = progress
                    }
                })
    
                rankings[client.roomName].sort((a, b) => {return b.progress - a.progress})
                var count = 1;
    
                rankings[client.roomName].forEach((player) => {
                    player.rank = count
                    count++
                })
    
                io.sockets.in(client.roomName).emit('updateLeaderboard', {rankings: rankings[client.roomName]})
            }
        })
        

        client.on('keyup', ({keyCode, position, velocity, rotation, quaternion}) => {
            client.broadcast.to(client.roomName).emit('opponentKeyup', {keyCode, position, velocity, rotation, quaternion, socket_id: client.id})
        }) 
        
        client.on('keydown', ({keyCode, position, velocity, rotation, quaternion}) => {
            client.broadcast.to(client.roomName).emit('opponentKeydown', {keyCode, position, velocity, rotation, quaternion, socket_id: client.id})
        })

        client.on('gameOver', () => {
            client.broadcast.to(client.roomName).emit('opponentGameOver', {})
        })
    })

}

export default mainsocket