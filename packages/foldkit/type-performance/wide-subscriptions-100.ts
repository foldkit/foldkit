import { Schema, Stream } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import * as Story from 'foldkit/story'

const Model = Schema.Struct({ count: Schema.Number })
const Message = defineMessageUnion({
  ReceivedCount0: { count: Schema.Number },
  ReceivedCount1: { count: Schema.Number },
  ReceivedCount2: { count: Schema.Number },
  ReceivedCount3: { count: Schema.Number },
  ReceivedCount4: { count: Schema.Number },
  ReceivedCount5: { count: Schema.Number },
  ReceivedCount6: { count: Schema.Number },
  ReceivedCount7: { count: Schema.Number },
  ReceivedCount8: { count: Schema.Number },
  ReceivedCount9: { count: Schema.Number },
  ReceivedCount10: { count: Schema.Number },
  ReceivedCount11: { count: Schema.Number },
  ReceivedCount12: { count: Schema.Number },
  ReceivedCount13: { count: Schema.Number },
  ReceivedCount14: { count: Schema.Number },
  ReceivedCount15: { count: Schema.Number },
  ReceivedCount16: { count: Schema.Number },
  ReceivedCount17: { count: Schema.Number },
  ReceivedCount18: { count: Schema.Number },
  ReceivedCount19: { count: Schema.Number },
  ReceivedCount20: { count: Schema.Number },
  ReceivedCount21: { count: Schema.Number },
  ReceivedCount22: { count: Schema.Number },
  ReceivedCount23: { count: Schema.Number },
  ReceivedCount24: { count: Schema.Number },
  ReceivedCount25: { count: Schema.Number },
  ReceivedCount26: { count: Schema.Number },
  ReceivedCount27: { count: Schema.Number },
  ReceivedCount28: { count: Schema.Number },
  ReceivedCount29: { count: Schema.Number },
  ReceivedCount30: { count: Schema.Number },
  ReceivedCount31: { count: Schema.Number },
  ReceivedCount32: { count: Schema.Number },
  ReceivedCount33: { count: Schema.Number },
  ReceivedCount34: { count: Schema.Number },
  ReceivedCount35: { count: Schema.Number },
  ReceivedCount36: { count: Schema.Number },
  ReceivedCount37: { count: Schema.Number },
  ReceivedCount38: { count: Schema.Number },
  ReceivedCount39: { count: Schema.Number },
  ReceivedCount40: { count: Schema.Number },
  ReceivedCount41: { count: Schema.Number },
  ReceivedCount42: { count: Schema.Number },
  ReceivedCount43: { count: Schema.Number },
  ReceivedCount44: { count: Schema.Number },
  ReceivedCount45: { count: Schema.Number },
  ReceivedCount46: { count: Schema.Number },
  ReceivedCount47: { count: Schema.Number },
  ReceivedCount48: { count: Schema.Number },
  ReceivedCount49: { count: Schema.Number },
  ReceivedCount50: { count: Schema.Number },
  ReceivedCount51: { count: Schema.Number },
  ReceivedCount52: { count: Schema.Number },
  ReceivedCount53: { count: Schema.Number },
  ReceivedCount54: { count: Schema.Number },
  ReceivedCount55: { count: Schema.Number },
  ReceivedCount56: { count: Schema.Number },
  ReceivedCount57: { count: Schema.Number },
  ReceivedCount58: { count: Schema.Number },
  ReceivedCount59: { count: Schema.Number },
  ReceivedCount60: { count: Schema.Number },
  ReceivedCount61: { count: Schema.Number },
  ReceivedCount62: { count: Schema.Number },
  ReceivedCount63: { count: Schema.Number },
  ReceivedCount64: { count: Schema.Number },
  ReceivedCount65: { count: Schema.Number },
  ReceivedCount66: { count: Schema.Number },
  ReceivedCount67: { count: Schema.Number },
  ReceivedCount68: { count: Schema.Number },
  ReceivedCount69: { count: Schema.Number },
  ReceivedCount70: { count: Schema.Number },
  ReceivedCount71: { count: Schema.Number },
  ReceivedCount72: { count: Schema.Number },
  ReceivedCount73: { count: Schema.Number },
  ReceivedCount74: { count: Schema.Number },
  ReceivedCount75: { count: Schema.Number },
  ReceivedCount76: { count: Schema.Number },
  ReceivedCount77: { count: Schema.Number },
  ReceivedCount78: { count: Schema.Number },
  ReceivedCount79: { count: Schema.Number },
  ReceivedCount80: { count: Schema.Number },
  ReceivedCount81: { count: Schema.Number },
  ReceivedCount82: { count: Schema.Number },
  ReceivedCount83: { count: Schema.Number },
  ReceivedCount84: { count: Schema.Number },
  ReceivedCount85: { count: Schema.Number },
  ReceivedCount86: { count: Schema.Number },
  ReceivedCount87: { count: Schema.Number },
  ReceivedCount88: { count: Schema.Number },
  ReceivedCount89: { count: Schema.Number },
  ReceivedCount90: { count: Schema.Number },
  ReceivedCount91: { count: Schema.Number },
  ReceivedCount92: { count: Schema.Number },
  ReceivedCount93: { count: Schema.Number },
  ReceivedCount94: { count: Schema.Number },
  ReceivedCount95: { count: Schema.Number },
  ReceivedCount96: { count: Schema.Number },
  ReceivedCount97: { count: Schema.Number },
  ReceivedCount98: { count: Schema.Number },
  ReceivedCount99: { count: Schema.Number },
})
const Definition = Block.makeDefinition('WideSubscriptions100', {
  Model,
  Message,
})

const subscriptions = Definition.makeSubscriptions(entry => ({
  count0: entry('Count0', {
    messages: [Message.ReceivedCount0],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count1: entry('Count1', {
    messages: [Message.ReceivedCount1],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count2: entry('Count2', {
    messages: [Message.ReceivedCount2],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count3: entry('Count3', {
    messages: [Message.ReceivedCount3],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count4: entry('Count4', {
    messages: [Message.ReceivedCount4],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count5: entry('Count5', {
    messages: [Message.ReceivedCount5],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count6: entry('Count6', {
    messages: [Message.ReceivedCount6],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count7: entry('Count7', {
    messages: [Message.ReceivedCount7],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count8: entry('Count8', {
    messages: [Message.ReceivedCount8],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count9: entry('Count9', {
    messages: [Message.ReceivedCount9],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count10: entry('Count10', {
    messages: [Message.ReceivedCount10],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count11: entry('Count11', {
    messages: [Message.ReceivedCount11],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count12: entry('Count12', {
    messages: [Message.ReceivedCount12],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count13: entry('Count13', {
    messages: [Message.ReceivedCount13],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count14: entry('Count14', {
    messages: [Message.ReceivedCount14],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count15: entry('Count15', {
    messages: [Message.ReceivedCount15],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count16: entry('Count16', {
    messages: [Message.ReceivedCount16],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count17: entry('Count17', {
    messages: [Message.ReceivedCount17],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count18: entry('Count18', {
    messages: [Message.ReceivedCount18],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count19: entry('Count19', {
    messages: [Message.ReceivedCount19],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count20: entry('Count20', {
    messages: [Message.ReceivedCount20],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count21: entry('Count21', {
    messages: [Message.ReceivedCount21],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count22: entry('Count22', {
    messages: [Message.ReceivedCount22],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count23: entry('Count23', {
    messages: [Message.ReceivedCount23],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count24: entry('Count24', {
    messages: [Message.ReceivedCount24],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count25: entry('Count25', {
    messages: [Message.ReceivedCount25],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count26: entry('Count26', {
    messages: [Message.ReceivedCount26],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count27: entry('Count27', {
    messages: [Message.ReceivedCount27],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count28: entry('Count28', {
    messages: [Message.ReceivedCount28],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count29: entry('Count29', {
    messages: [Message.ReceivedCount29],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count30: entry('Count30', {
    messages: [Message.ReceivedCount30],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count31: entry('Count31', {
    messages: [Message.ReceivedCount31],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count32: entry('Count32', {
    messages: [Message.ReceivedCount32],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count33: entry('Count33', {
    messages: [Message.ReceivedCount33],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count34: entry('Count34', {
    messages: [Message.ReceivedCount34],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count35: entry('Count35', {
    messages: [Message.ReceivedCount35],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count36: entry('Count36', {
    messages: [Message.ReceivedCount36],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count37: entry('Count37', {
    messages: [Message.ReceivedCount37],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count38: entry('Count38', {
    messages: [Message.ReceivedCount38],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count39: entry('Count39', {
    messages: [Message.ReceivedCount39],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count40: entry('Count40', {
    messages: [Message.ReceivedCount40],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count41: entry('Count41', {
    messages: [Message.ReceivedCount41],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count42: entry('Count42', {
    messages: [Message.ReceivedCount42],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count43: entry('Count43', {
    messages: [Message.ReceivedCount43],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count44: entry('Count44', {
    messages: [Message.ReceivedCount44],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count45: entry('Count45', {
    messages: [Message.ReceivedCount45],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count46: entry('Count46', {
    messages: [Message.ReceivedCount46],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count47: entry('Count47', {
    messages: [Message.ReceivedCount47],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count48: entry('Count48', {
    messages: [Message.ReceivedCount48],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count49: entry('Count49', {
    messages: [Message.ReceivedCount49],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count50: entry('Count50', {
    messages: [Message.ReceivedCount50],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count51: entry('Count51', {
    messages: [Message.ReceivedCount51],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count52: entry('Count52', {
    messages: [Message.ReceivedCount52],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count53: entry('Count53', {
    messages: [Message.ReceivedCount53],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count54: entry('Count54', {
    messages: [Message.ReceivedCount54],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count55: entry('Count55', {
    messages: [Message.ReceivedCount55],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count56: entry('Count56', {
    messages: [Message.ReceivedCount56],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count57: entry('Count57', {
    messages: [Message.ReceivedCount57],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count58: entry('Count58', {
    messages: [Message.ReceivedCount58],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count59: entry('Count59', {
    messages: [Message.ReceivedCount59],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count60: entry('Count60', {
    messages: [Message.ReceivedCount60],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count61: entry('Count61', {
    messages: [Message.ReceivedCount61],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count62: entry('Count62', {
    messages: [Message.ReceivedCount62],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count63: entry('Count63', {
    messages: [Message.ReceivedCount63],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count64: entry('Count64', {
    messages: [Message.ReceivedCount64],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count65: entry('Count65', {
    messages: [Message.ReceivedCount65],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count66: entry('Count66', {
    messages: [Message.ReceivedCount66],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count67: entry('Count67', {
    messages: [Message.ReceivedCount67],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count68: entry('Count68', {
    messages: [Message.ReceivedCount68],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count69: entry('Count69', {
    messages: [Message.ReceivedCount69],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count70: entry('Count70', {
    messages: [Message.ReceivedCount70],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count71: entry('Count71', {
    messages: [Message.ReceivedCount71],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count72: entry('Count72', {
    messages: [Message.ReceivedCount72],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count73: entry('Count73', {
    messages: [Message.ReceivedCount73],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count74: entry('Count74', {
    messages: [Message.ReceivedCount74],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count75: entry('Count75', {
    messages: [Message.ReceivedCount75],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count76: entry('Count76', {
    messages: [Message.ReceivedCount76],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count77: entry('Count77', {
    messages: [Message.ReceivedCount77],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count78: entry('Count78', {
    messages: [Message.ReceivedCount78],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count79: entry('Count79', {
    messages: [Message.ReceivedCount79],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count80: entry('Count80', {
    messages: [Message.ReceivedCount80],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count81: entry('Count81', {
    messages: [Message.ReceivedCount81],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count82: entry('Count82', {
    messages: [Message.ReceivedCount82],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count83: entry('Count83', {
    messages: [Message.ReceivedCount83],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count84: entry('Count84', {
    messages: [Message.ReceivedCount84],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count85: entry('Count85', {
    messages: [Message.ReceivedCount85],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count86: entry('Count86', {
    messages: [Message.ReceivedCount86],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count87: entry('Count87', {
    messages: [Message.ReceivedCount87],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count88: entry('Count88', {
    messages: [Message.ReceivedCount88],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count89: entry('Count89', {
    messages: [Message.ReceivedCount89],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count90: entry('Count90', {
    messages: [Message.ReceivedCount90],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count91: entry('Count91', {
    messages: [Message.ReceivedCount91],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count92: entry('Count92', {
    messages: [Message.ReceivedCount92],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count93: entry('Count93', {
    messages: [Message.ReceivedCount93],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count94: entry('Count94', {
    messages: [Message.ReceivedCount94],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count95: entry('Count95', {
    messages: [Message.ReceivedCount95],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count96: entry('Count96', {
    messages: [Message.ReceivedCount96],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count97: entry('Count97', {
    messages: [Message.ReceivedCount97],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count98: entry('Count98', {
    messages: [Message.ReceivedCount98],
    handler: function* () {
      return () => Stream.never
    },
  }),
  count99: entry('Count99', {
    messages: [Message.ReceivedCount99],
    handler: function* () {
      return () => Stream.never
    },
  }),
}))

const emitter = Story.Subscription.from(subscriptions)

export const lastEmission = emitter.emit(
  subscriptions.count99,
  Message.ReceivedCount99({ count: 99 }),
)
