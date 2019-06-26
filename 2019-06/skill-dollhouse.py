"""
# Dollhouse (yet another idea expressed in code)
## About
This is a Mycroft AI Skill inspired by the Dollhouse series...
So there's this scene where Miss DeWitt uses a voice command ("There are three
flowers in a vase. The third flower is green.") to activate the killing imprint
of a sweet sleeping Doll (November AKA Mellie). Another command is used to turn
her back to her nice 'Mellie' persona. The whole thing is just wow!

This Skill uses the same de/activation phrases to start/stop a "killer process" that
watches USB ports and "kills" (i.e. locks, wipes, then shuts down) the PC when an
unauthorized device is connected. More info: https://github.com/hephaest0s/usbkill

NOTE: Just suppose there's a decorator @intent_verbatim_handler(text) which is basically
the same as @intent_file_handler("x.intent") where x.intent contains that `text`.

## Credits
Djalil Dreamski (@dreamski21)

## Category
**Security**

## Tags
#system
#usbkill
"""

from mycroft.skills.core import MycroftSkill, intent_verbatim_handler
import subprocess

killer_process = None

class DollhouseSkill(MycroftSkill):

    def __init__(self):
        super(DollhouseSkill, self).__init__(name="DollhouseSkill")

     @intent_verbatim_handler("There are three flowers in a vase. The third flower is green.")
     def handle_activation(self, message):
          if killer_process is None:
               killer_process = Popen("python usbkill.py") # sudo
               #self.gui.set_color = 'red'

     @intent_verbatim_handler("There are three flowers in a vase. The third flower is yellow.")
     def handle_deactivation(self, message):
          if killer_process is not None:
               killer_process.terminate()
               killer_process = None
               #self.gui.set_color = 'blue'
               self.speak("huh")
