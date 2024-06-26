using pusher.webapi.Models.DB;
using pusher.webapi.Models.RO;
using pusher.webapi.Models.SO;
using Riok.Mapperly.Abstractions;

namespace pusher.webapi.Common;

[Mapper]
public static partial class MyMapper
{
    public static partial Room UpdateRoomROToRoom(UpdateRoomRO updateRoomRO);

    public static partial void MergeUpdateChannelROToChannel(UpdateChannelRO updateChannelRO, Channel channel);

    public static partial Channel CreateChannelROToChannel(CreateChannelRO createChannelRO);

    public static partial ChannelJoinedRoomsSO RoomToChannelJoinedRoomsSO(Room room);

    public static partial RoomMessageHistorySO MessageToRoomMessageHistorySO(Message message);
}
