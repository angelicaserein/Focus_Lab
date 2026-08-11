// 生态缸页文案。每条 key -> { en, zh }。
export default {
  "aquarium.title": { en: "Aquarium", zh: "生态缸" },
  "aquarium.buy": { en: "Bring home a fish", zh: "换一条鱼" },
  "aquarium.cost": { en: "{n} coins", zh: "{n} 金币" },
  "aquarium.needMore": { en: "{n} more coins to go", zh: "还差 {n} 金币" },
  "aquarium.addMore": {
    en: "All species collected. Pick any below to raise a second one ({n} coins).",
    zh: "全员到齐了。想再养一只的话，挑下面任意一种（{n} 金币）。",
  },
  "aquarium.addOne": { en: "Add another ({n} coins)", zh: "再请一只（{n} 金币）" },
  // 缸是可以上手的（见 AquariumTank 的指针交互）——不说一句没人会想到去点水面。
  // 收进标题旁的问号气泡里，跟专注页优先级矩阵那颗一个样式，别在缸下面占一整段
  "aquarium.tapHintAria": { en: "How do I play with the tank?", zh: "缸里能怎么玩？" },
  "aquarium.tapHint": {
    en: "Tap the surface to scatter food; tap deeper and a ripple spreads, nudging whoever it passes aside. Press and hold one to pick it up. Go slowly and they follow your finger; swipe fast and they scatter.",
    zh: "点水面撒点饵；点水里则荡开一圈水波，扫到谁就把谁轻轻推开。按住一只可以把它拎起来。手慢慢挪，它们会跟过来；划得快，就都散开了。",
  },
  "aquarium.dexTitle": { en: "Residents", zh: "已入住" },
  "aquarium.dexCount": { en: "{n} / {total} kinds", zh: "{n} / {total} 种" },
  "aquarium.unmet": { en: "Not yet met", zh: "尚未相遇" },
  "aquarium.new": { en: "New find", zh: "新发现" },
  "aquarium.collect": { en: "Take it in ✓", zh: "收下它 ✓" },

  // —— 成长（卵 → 幼体 → 成体，见 data/aquarium/growth）——
  "aquarium.stage.0": { en: "Egg", zh: "卵" },
  "aquarium.stage.1": { en: "Young", zh: "幼体" },
  "aquarium.stage.2": { en: "Grown", zh: "成体" },
  "aquarium.growMin": { en: "{n} min to go", zh: "还有 {n} 分钟" },
  "aquarium.growHour": { en: "{n} h to go", zh: "还有 {n} 小时" },
  "aquarium.growTitle": { en: "Growing up", zh: "生长情况" },
  "aquarium.growCount": {
    en: "{n} of {total} still growing",
    zh: "{total} 只里还有 {n} 只在长",
  },
  "aquarium.growAllDone": { en: "All grown", zh: "全都长成了" },
  "aquarium.feedNote": {
    en: "Feeding helps: every pellet eaten moves that one a couple of minutes ahead. Eggs don't eat — they hatch on their own time.",
    zh: "喂食有用：吃到一粒饵，那一只就往前赶两分钟。卵不吃东西，得自己等到破膜。",
  },
  "aquarium.eggNote": {
    en: "It goes in as an egg — give it a while to grow into this.",
    zh: "放进缸里的是一颗卵，过一阵子才会长成这个样子。",
  },

  "aquarium.rarity.1": { en: "Common", zh: "常见" },
  "aquarium.rarity.2": { en: "Rare", zh: "稀有" },
  "aquarium.rarity.3": { en: "Epic", zh: "史诗" },

  // —— 常见 ——
  "aquarium.species.fish.name": { en: "Little Fish", zh: "小鱼" },
  "aquarium.species.fish.desc": { en: "The first flicker of light you meet in the shallows.", zh: "浅滩边最先遇见的一抹微光。" },
  "aquarium.species.guppy.name": { en: "Guppy", zh: "孔雀鱼" },
  "aquarium.species.guppy.desc": { en: "Tiny body, a tail like a trailing skirt.", zh: "身子小小的，尾巴拖成一条裙。" },
  "aquarium.species.shell.name": { en: "Shell", zh: "贝" },
  "aquarium.species.shell.desc": { en: "A whisper the tide left behind on the sand.", zh: "潮退后留在沙上的一句低语。" },
  "aquarium.species.crab.name": { en: "Hermit Crab", zh: "寄居蟹" },
  "aquarium.species.crab.desc": { en: "Wanders about, carrying a borrowed home.", zh: "背着借来的家，四处走走。" },
  "aquarium.species.shrimp.name": { en: "Cherry Shrimp", zh: "樱花虾" },
  "aquarium.species.shrimp.desc": { en: "Combs the gravel all day, never in a hurry.", zh: "整天在石缝里翻找，从不着急。" },
  "aquarium.species.snail.name": { en: "Sea Snail", zh: "海螺" },
  "aquarium.species.snail.desc": { en: "Crosses the glass in an afternoon. That counts.", zh: "一下午爬过一面缸壁——也算走完了。" },
  "aquarium.species.seaweed.name": { en: "Seagrass", zh: "海草" },
  "aquarium.species.seaweed.desc": { en: "Doesn't go anywhere, just sways.", zh: "哪儿也不去，只是摇。" },
  "aquarium.species.star.name": { en: "Sea Star", zh: "海星" },
  "aquarium.species.star.desc": { en: "Five arms spread wide, inching along the glass.", zh: "五臂张开，贴着缸壁慢慢挪。" },

  // —— 稀有 ——
  "aquarium.species.clown.name": { en: "Clownfish", zh: "小丑鱼" },
  "aquarium.species.clown.desc": { en: "Wears three white stripes, afraid of nothing.", zh: "穿着三道白条纹，什么都不怕。" },
  "aquarium.species.tang.name": { en: "Blue Tang", zh: "蓝吊" },
  "aquarium.species.tang.desc": { en: "Forgets where it was going, and goes anyway.", zh: "忘了要去哪，还是游了过去。" },
  "aquarium.species.jelly.name": { en: "Jellyfish", zh: "水母" },
  "aquarium.species.jelly.desc": { en: "A clear umbrella unfolding slowly in still water.", zh: "在静水里慢慢舒张的透明伞。" },
  "aquarium.species.coral.name": { en: "Coral", zh: "珊瑚" },
  "aquarium.species.coral.desc": { en: "Quietly grows into a whole forest.", zh: "不动声色地长成一片森林。" },
  "aquarium.species.anemone.name": { en: "Sea Anemone", zh: "海葵" },
  "aquarium.species.anemone.desc": { en: "Opens up whenever the current is gentle.", zh: "水一温柔，它就张开。" },
  "aquarium.species.puffer.name": { en: "Pufferfish", zh: "河豚" },
  "aquarium.species.puffer.desc": { en: "Rounder when startled. Deflates soon enough.", zh: "一受惊就鼓成球，过一会儿也就消了。" },
  "aquarium.species.angel.name": { en: "Angelfish", zh: "神仙鱼" },
  "aquarium.species.angel.desc": { en: "Long fins, unhurried turns.", zh: "长鳍拖着，转身也不慌。" },
  "aquarium.species.seahorse.name": { en: "Seahorse", zh: "海马" },
  "aquarium.species.seahorse.desc": { en: "Naps with its tail hooked around a weed.", zh: "用尾巴勾住水草打个盹。" },

  // —— 史诗 ——
  "aquarium.species.koi.name": { en: "Koi", zh: "锦鲤" },
  "aquarium.species.koi.desc": { en: "Someone once made a wish on a fish like this.", zh: "有人曾对着这样一条鱼许过愿。" },
  "aquarium.species.turtle.name": { en: "Sea Turtle", zh: "海龟" },
  "aquarium.species.turtle.desc": { en: "Slow, but never lost.", zh: "慢，但从不迷路。" },
  "aquarium.species.octopus.name": { en: "Octopus", zh: "章鱼" },
  "aquarium.species.octopus.desc": { en: "Eight arms, and still it thinks things over.", zh: "八条腕，还是要想一想再动。" },
  "aquarium.species.ray.name": { en: "Manta Ray", zh: "魟鱼" },
  "aquarium.species.ray.desc": { en: "Flies more than it swims.", zh: "与其说在游，不如说在飞。" },
  "aquarium.species.axolotl.name": { en: "Axolotl", zh: "六角恐龙" },
  "aquarium.species.axolotl.desc": { en: "Grows up on its own schedule, or not at all.", zh: "按自己的进度长大，不长也行。" },
  "aquarium.species.whale.name": { en: "Little Whale", zh: "小鲸" },
  "aquarium.species.whale.desc": { en: "Comes up for air, then goes back down.", zh: "浮上来换口气，再沉回去。" },
};
