import type {Library, Signal, SourceCheck} from "../../lib/model";
import {fixtureLibrary} from "./library.ts";

// Synthetic content exercises long names and notes without publishing a personal library.
export function responsiveLibrary(): Library {
  const base = fixtureLibrary();
  const names = ["花与纸", "AtelierOfVeryLongUnbrokenArtistNames", "月白工房", "小春日和", "星屑绘室", "风铃手帖", "雨夜创作室", "青空色"];
  const month = new Date().toLocaleDateString("en-CA", {timeZone: "Asia/Taipei"}).slice(0, 7);
  return {
    schemaVersion: 1,
    rawNotes: "用于界面验证的虚构收藏笔记。\n".repeat(40),
    artists: names.map((name, i) => ({...base.artists[0], id: `artist-${i}`, name,
      aliases: [`测试别名${i}`], works: [`纸上旅行第${i + 1}册`],
      circle: "纸间示例社团", category: "原创插画", tags: ["手绘", "FANBOX"],
      favorite: i < 6, monitor: true, color: i % 6,
      notes: "关于画师、作品与收藏缘分的长笔记。".repeat(18),
      links: {x: "", fanbox: `https://example.fanbox.cc`, booth: `https://example.booth.pm`, website: ""},
    })),
    collections: names.map((_, i) => ({...base.collections[0], id: `collection-${i}`, artistId: `artist-${i}`,
      title: i === 1 ? "纪念展限定亲签复制原画与特别收录收藏套装" : `纸上旅行 · 亲签色纸 ${i + 1}`,
      status: i % 2 ? "待确认" : "已入手", signature: "直笔签名", price: "JPY 6,000", channel: "示例展会",
      notes: "记录购买资格、保存方式与这一次相遇的心情，长笔记也应该可以顺利编辑。".repeat(6),
    })),
    benefits: names.slice(0, 6).map((_, i) => ({...base.benefits[0], id: `benefit-${i}`, artistId: `artist-${i}`,
      title: "连续支援纪念亲签色纸与特别复制原画", window: "每年 2 月 / 7 月开始，具体日期待公告",
      plans: "JPY 3,000 / 10,000，需核对指定档位", state: i % 2 ? "待核对" : "支援中",
      startDate: "2026-07-01", requiredMonths: 6,
      rules: "连续支援满六个月，请以官方公告的申请期限为准。",
    })),
    events: Array.from({length: 5}, (_, i) => ({...base.events[0], id: `event-${i}`,
      name: i === 1 ? "纸间原创插画与亲签收藏交流纪念展特别场" : `纸间示例展会 ${i + 1}`,
      date: `${month}-${19 + i}`, endDate: `${month}-${19 + i}`, confirmed: i % 2 === 0,
      location: "示例展览馆 · 东馆", artistIds: ["artist-0", "artist-1"],
      source: "https://example.com/event", booth: "东馆 A-01 / 签名场次 14:00–15:00",
      notes: "现场先着与抽选资格请阅读公告，长信息可以换行查看。".repeat(5),
    })),
  };
}
export function responsiveMonitoring(): {signals: Signal[]; checks: SourceCheck[]} {
  return {
    signals: [{id: "signal-demo", artistId: "artist-0", platform: "booth", kind: "上新线索", read: false,
      title: "纸上旅行纪念亲签色纸与限定收藏套装公开，购买资格与签名场次请核对商品公告。",
      url: "https://example.com/product", discoveredAt: "2026-11-01T12:00:00Z"}],
    checks: [{id: "check-demo", artistId: "artist-0", platform: "booth", url: "https://example.booth.pm",
      status: "limited", checkedAt: "2026-11-01T12:00:00Z", initialized: false, seen: [],
      message: "公开页面暂时读取受限，请打开画师主页核对公告。保留上次成功的基线，不会误报没有更新。"}],
  };
}
