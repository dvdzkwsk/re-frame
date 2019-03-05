import {assoc} from "@re-frame/utils"
import {createDraft, finishDraft} from "immer"

export var immer = {
  id: "immer",
  before: function(context) {
    var draft = createDraft(context.coeffects.db)
    return assoc(context, ["coeffects", "db"], draft)
  },
  after: function(context) {
    var db = finishDraft(context.effects.db || context.coeffects.db)
    return assoc(context, ["effects", "db"], db)
  },
}
