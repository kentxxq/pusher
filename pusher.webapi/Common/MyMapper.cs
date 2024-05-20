using pusher.webapi.Models;
using pusher.webapi.RO;
using Riok.Mapperly.Abstractions;

namespace pusher.webapi.Common;

[Mapper]
public static partial class MyMapper
{
    public static partial Room UpdateRoomROToRoom(UpdateRoomRO updateRoomRO);

    public static partial Channel CreateChannelROToChannel(CreateChannelRO createChannelRO);
}
