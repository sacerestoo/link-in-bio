from providers.generic.provider import PROVIDER as GENERIC_PROVIDER

from .app_store.provider import PROVIDER as APP_STORE
from .apple_music.provider import PROVIDER as APPLE_MUSIC
from .behance.provider import PROVIDER as BEHANCE
from .buy_me_a_coffee.provider import PROVIDER as BUY_ME_A_COFFEE
from .chzzk.provider import PROVIDER as CHZZK
from .discord.provider import PROVIDER as DISCORD
from .dribbble.provider import PROVIDER as DRIBBBLE
from .facebook.provider import PROVIDER as FACEBOOK
from .figma.provider import PROVIDER as FIGMA
from .ghost.provider import PROVIDER as GHOST
from .github.provider import PROVIDER as GITHUB
from .google_play.provider import PROVIDER as GOOGLE_PLAY
from .gumroad.provider import PROVIDER as GUMROAD
from .hashnode.provider import PROVIDER as HASHNODE
from .instagram.provider import PROVIDER as INSTAGRAM
from .kofi.provider import PROVIDER as KO_FI
from .linkedin.provider import PROVIDER as LINKEDIN
from .medium.provider import PROVIDER as MEDIUM
from .note.provider import PROVIDER as NOTE
from .patreon.provider import PROVIDER as PATREON
from .pinterest.provider import PROVIDER as PINTEREST
from .product_hunt.provider import PROVIDER as PRODUCT_HUNT
from .reddit.provider import PROVIDER as REDDIT
from .rss.provider import PROVIDER as RSS
from .soop.provider import PROVIDER as SOOP
from .soundcloud.provider import PROVIDER as SOUNDCLOUD
from .spotify.provider import PROVIDER as SPOTIFY
from .substack.provider import PROVIDER as SUBSTACK
from .threads.provider import PROVIDER as THREADS
from .tiktok.provider import PROVIDER as TIKTOK
from .twitch.provider import PROVIDER as TWITCH
from .x.provider import PROVIDER as X
from .youtube.provider import PROVIDER as YOUTUBE
from .youtube_music.provider import PROVIDER as YOUTUBE_MUSIC

PROVIDERS = (
    APPLE_MUSIC,
    APP_STORE,
    BEHANCE,
    BUY_ME_A_COFFEE,
    CHZZK,
    DISCORD,
    DRIBBBLE,
    FACEBOOK,
    FIGMA,
    GITHUB,
    GOOGLE_PLAY,
    GUMROAD,
    HASHNODE,
    GHOST,
    INSTAGRAM,
    KO_FI,
    LINKEDIN,
    MEDIUM,
    NOTE,
    PATREON,
    PINTEREST,
    PRODUCT_HUNT,
    REDDIT,
    RSS,
    SOUNDCLOUD,
    SOOP,
    SPOTIFY,
    SUBSTACK,
    THREADS,
    TIKTOK,
    TWITCH,
    X,
    YOUTUBE,
    YOUTUBE_MUSIC,
)

__all__ = ["GENERIC_PROVIDER", "PROVIDERS"]
