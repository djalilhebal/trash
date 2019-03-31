# A SILLY USE-CASE OF 'DAFFY DARJA'
# Romyo. A good name for a 7alab, eh? Let's take this a little further and nerdier:
# Have you ever thought of the possibility of an "AI" being able to one day talk in Darja?
# Think no more!
# Just imagine Romyo as an average-Algerian-minded *womanizer* whose *goal* is
#  to get to know girls, gain their trust, get their info, and then... >.<
# How will he actually be able to do that?
# Well, what if Romyo sees life as a game (and so employs 'Game Theory' principles)
#  and even can lie (like "Leo" -- that 'decision tree learning' thingy)?
# What if he internally *thinks* in English but mimic dialects (using DaffyDarja)?
# Totally workable, huh?
#
# NOTES
# -----
# - Inspired by Negobot (Lolita chatbot), basically a pedo hunter.
# - It's just an idea. It's unlikely that I will make it [soon].
# - It's expressed in Ruby pseudo-code because my shit is precious.

class Romyo < Person
    @name = 'Aymen'
    @age  = 20
    @work = 'Army'
    @persona = ['goal-oriented', 'offensive', 'animalistic', 'toxic masculinity']
    @lingo = ['ahla hbb', 'cc' ]
    @dialect = DaffyDarja.new({
      wilaya => 'Algiers', # Romyo will talk as if he were from Algiers, Algeria.
      education => 'poor' # Romyo won't try to use French/English words/expressions.
    })
    @goals = [
      'Be cool and loveable',
      'Get basic info: name, age, approx location',
      'Get sensitive info: exact address, number, pic',
      '...',
    ]
    
    # "chkoun nta" > "Who are you?"
    # "I'm Aymen." > "ana aymen"
    def reply(input)
      english = DaffyDarja.to_english(input)
      thought = think(understand(english))
      DaffyDarja.to_darja(thought, @dialect)
    end

    def think(context)
        if context.is_question?
          if knows_about? context["topic"]
            return recall(context["topic"])
          else
            return "Who the hell would know/care about that?"
          end
        else # It's a statement, remember it and say something ("OK", "As y'say", idk)
          return remember(context)
        end
    end
  end
