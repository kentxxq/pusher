using pusher.webapi.Models.DB;
using pusher.webapi.Models.RO;
using Riok.Mapperly.Abstractions;

namespace pusher.webapi.Common;

[Mapper]
public static partial class MyMapper
{
    public static partial Room UpdateRoomROToRoom(UpdateRoomRO updateRoomRO);

    public static partial void MergeUpdateChannelROToChannel(UpdateChannelRO updateChannelRO, Channel channel);

    public static partial Channel CreateChannelROToChannel(CreateChannelRO createChannelRO);
}
