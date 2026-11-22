// The shape of a large real story (200 actions): which action follows which,
// by what kind of trigger, and how long each typed reply is. Names and texts
// are left out. Each action is written as `flags:links`, flags F for the
// initial action and E for an ending, each link `from.kindLength` where from
// is the index of the previous action, kind G (geofence), T (text) or A
// (always), f marks a fallback reply and the number is the reply's length.
// `order` lists the indexes in the order the action list sorts them, so the
// ids given here sort the same way.
const shape =
  "F:;:0.G;:1.T4;:2.T6;:3.T4;:4.T2;:5.A;:6.A;:7.T4;:7.T4;:9.Tf,11.Tf;:10.T5;:9.T6,11.T6;:12.T4;:13.T4;:14.A,199.A;:15.T10;:16.T2;:17.T9;:18.Tf,20.Tf;:19.T5;:18.T6,20.T6;:21.T4;:22.T4;:23.A,197.A;:24.T10;:25.T6;:26.T2;:27.Tf,29.Tf;:28.T5;:27.T6,29.T6;:30.T4;:31.T4;:32.A,195.A;:33.T6;:34.T18;:35.T8;:36.T2;:37.Tf,39.Tf;:38.T5;:37.T6,39.T6;:40.T4;:41.T4;:42.A,193.A;:43.T2;:44.Tf,46.Tf;:45.T5;:44.T6,46.T6;:47.A4;:48.A;:191.A,49.A;:50.T2;:51.Tf,53.Tf;:52.T5;:51.T6,53.T6;:54.A4;:55.A;:189.A,56.A;:57.T6;:58.T3;:59.T10;:60.T9;:61.T6,65.T6;:61.Tf,65.Tf;:61.T6,65.T6;:63.T5,62.T5,64.T5,185.T3,70.T3;:61.T6,65.T6;:66.A4;:67.A;:180.A,68.A;:69.T5;:183.A,180.A,187.A,68.A;:71.T7;:72.T3;:73.T6;:74.T4;:75.T2;:76.Tf,78.Tf;:77.T5;:76.T6,78.T6;:79.T4;:80.T4;:81.A,178.A;:82.T2;:83.A;:84.A;:85.T3;:86.T5;:87.Tf,89.Tf;:88.T5;:87.T6,89.T6,87.T6,89.T6;:90.T6;:91.T6;:92.T6,176.T6,172.T6,173.T6;:92.T13,93.T2,176.T13,172.T13,173.T13;:94.A,175.A,171.A;:95.T6;:96.T2;:97.T6;:98.T2;:99.T6,106.T6;:99.T6,106.T6;:99.T6,106.T6;:99.T6,106.T6;:99.Tf,106.Tf;:99.T6,106.T6;:104.T5,103.T5,101.T5,102.T5,105.T5,100.T5,114.T2;:99.T6,106.T6;:107.T6;:108.T2;:146.A,109.A;:156.A,167.A,110.A,150.A;:111.T2;:112.T2;:113.T2;:156.A,167.A,110.A,150.A;:115.T1;:116.Tf;:116.T14,116.T14,116.T14,116.T14,116.T14;:118.T4,117.T4;:119.T4;:120.T4;:121.A,144.A;:122.T2,122.T3;:123.T4;:124.T6;:125.T2;:126.T6,133.T6,136.T6,135.T6;:126.T6,133.T6,136.T6,135.T6;:126.T6,133.T6,136.T6,135.T6;:126.T6,133.T6,136.T6,135.T6;:126.T6,133.T6,136.T6,135.T6;:126.Tf,133.Tf,136.Tf,135.Tf;:132.T5,127.T2,130.T2,131.T2;:126.T6,133.T6,136.T6,135.T6;:129.T2,134.T2,128.T2;:129.T2,134.T2,128.T2;:129.T2,134.T2,128.T2;:137.T2;:138.T2;:139.A;:140.A2;E:141.T4;:119.T6;:143.T2;:107.T4;:145.T4;:99.T6,106.T6;:147.T4;:148.T4;:149.A,152.A;:147.A11;:151.A;:99.T6,106.T6;:153.T4;:154.T4;:163.A,161.A,155.A,158.A;:153.T6;:157.T2;:99.T6,106.T6;:159.T6;:160.T2;:159.T4;:162.T4;:99.T6,106.T6;:164.T4;:165.T4;:166.A,169.A;:164.A11;:168.A;:92.T8,176.T8;:170.T4;:171.A;:175.A,171.A;:92.T7,172.T7;:174.T4;:175.A;:79.A7;:177.A;:66.T4;:179.T4;:61.T6,65.T6;:181.T4;:182.T4;:183.A,187.A;:184.T5;:181.A4;:186.A;:54.T4;:188.T4;:47.T4;:190.T4;:40.A4;:192.A;:30.A4;:194.A;:21.A4;:196.A;:12.A4;:198.A";
const order =
  "166,94,134,155,83,165,89,11,79,2,0,64,176,185,150,105,167,107,169,161,9,33,197,100,132,178,12,37,160,88,80,127,128,96,13,198,120,158,123,56,142,39,125,73,26,35,171,48,86,81,54,112,101,111,91,147,195,45,41,102,92,3,34,31,6,170,29,184,177,109,22,82,187,69,50,58,76,133,121,191,67,30,32,14,66,87,118,163,117,108,85,72,168,38,60,65,4,114,182,141,139,140,138,74,152,129,77,99,27,97,146,8,20,10,153,90,119,135,148,98,137,130,154,24,151,52,106,144,122,42,5,18,75,78,36,194,172,116,159,196,162,136,192,93,62,186,115,156,63,70,43,7,55,84,174,179,46,149,145,126,110,143,51,59,44,57,61,189,131,157,19,175,1,68,71,47,17,164,188,173,183,103,53,49,190,124,40,95,15,21,28,193,23,104,113,199,16,181,25,180";

const kinds = { G: "GEOFENCE", T: "TEXT", A: "ALWAYS" };
const rank = new Map(order.split(",").map((index, r) => [Number(index), r]));
const id = (index) => "a" + String(rank.get(index)).padStart(3, "0");

export const largeStory = shape.split(";").map((written, index) => {
  const [flags, links] = written.split(":");
  const action = { id: id(index), prevs: [] };
  if (flags.includes("F")) action.firstAction = true;
  if (flags.includes("E")) action.endgame = true;
  if (links)
    action.prevs = links.split(",").map((link) => {
      const [from, how] = link.split(".");
      const fallback = how.includes("f");
      const length = Number(how.slice(1).replace("f", "")) || 0;
      return {
        prev: id(Number(from)),
        conditionType: kinds[how[0]],
        fallback,
        userReply: fallback ? "fallback:" : "字".repeat(length),
      };
    });
  return action;
});
