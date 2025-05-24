# feedback-collector README

The feedback-collector extension are developed as part of my master thesis from IT University of Copenhagen in Software Desing with the topic "Feedback-driven developement - manageing data in feedback loops". The feedback-collector collects all feedback data displayed in the problems console in the VS Code UI and added and removed debugging breakepoints, along with build-logs written to the terminal, when the build is triggered through the extension commands.  

## Features

The feedback-collector etension are mostly a passive extension that collects data in the background and converts it to a ndjson file. 
The feedback collector can activate builds througt the command pallet and collect build logs.

## Requirements

The feedback collector support both maven and gradle java projects. Befor the feedback collector can be properly activated, it is nessecary to input developerID and featureID. The IDs will be added to each object in the ndjason file. 
