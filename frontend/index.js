import {
    initializeBlock,
    useBase,
    useRecords,
    useGlobalConfig,
    Box,
    CellRenderer,
    Heading,
    Icon,
    Text,
    ViewPickerSynced,
    RecordCard,
} from '@airtable/blocks/ui';
import React from 'react';

const GlobalConfigKeys = {
    VIEW_ID: 'viewId',
};

function ScheduleConflictsBlock() {
    const base = useBase();
    const globalConfig = useGlobalConfig();

    // We want to render the list of records in this table.
    const appointmentsTable = base.getTableByName('Appointments');
    const peopleTable = base.getTableByName('People');

    // The view ID is stored in globalConfig using ViewPickerSynced.
    const viewId = globalConfig.get(GlobalConfigKeys.VIEW_ID);
    const appointmentsView = appointmentsTable.getViewByIdIfExists(viewId);

    const people = useRecords(peopleTable);
    const appointments = useRecords(appointmentsView);

    const peopleAppointments = people.map(person => {
        const personLinkedAppointments = person.getCellValue("Appointments");
        const appointmentIds = personLinkedAppointments.map(a => a.id);

        const personAppointments = appointments.filter(a => appointmentIds.includes(a.id));

        const personAppntmntsObj = {};
        personAppntmntsObj.person = person.getCellValue('Name');
        personAppntmntsObj.appointments = personAppointments;
        return personAppntmntsObj;
    });

    const conflicts = [];
    peopleAppointments.forEach(personAppntmnts => {
        const person = personAppntmnts.person;
        const appointments = personAppntmnts.appointments;

        const conflict = {};
        const conflictingRecords = new Set();
        const appointmentsChecked = [];
        for (var i=0; i < appointments.length; i++) {
            let start = new Date(appointments[i].getCellValue("Start"));
            let end = new Date(appointments[i].getCellValue("End"));
            let appt = appointments[i];
            appointmentsChecked.push(appt.id);

            appointments.forEach(compareAppntmnt => {
                if (!appointmentsChecked.includes(compareAppntmnt.id)) {
                    let compareStart = new Date(compareAppntmnt.getCellValue("Start"));
                    let compareEnd = new Date(compareAppntmnt.getCellValue("End"));

                    if (
                        // #1 : Preceeding Overlap
                        (compareStart > start && compareStart < end) ||
                        // #2 : Post-ceeding Overlap
                        (compareEnd > start && compareEnd < end) ||
                        // #3 : Contained (inclusive)
                        (compareStart <= start && compareEnd >= end)
                    ) {
                        conflictingRecords.add(appt).add(compareAppntmnt);
                    }
                }
            });
        };

        if (conflictingRecords.size > 0) {
            conflict.person = person;
            conflict.conflictingAppointments = [...conflictingRecords];
            conflicts.push(conflict);
        }
    });

    console.log(conflicts);
    const conflictsDisplay = conflicts.length > 0 ? conflicts.map((conflict, index) => {
        return <ConflictContainer key={index} person={conflict.person} records={conflict.conflictingAppointments} />
    }) : null;

    return (
        <Box paddingX={2} marginX={1}>
            <h4>Select Appointments view to check conflicts in:</h4>
            <ViewPickerSynced table={appointmentsTable} globalConfigKey="viewId" />
            {conflictsDisplay}
        </Box>
    );
}

function ConflictContainer({person, records}) {
    const recordsDisplay = records.length > 0 ? records.map((record, index) => {
        return <RecordCard key={index} record={record} marginBottom={2} />
    }) : null;

    return (
        <Box padding={3} borderBottom="thick">
            <Heading marginBottom={1}>{person}</Heading>
            {recordsDisplay}
        </Box>
    );
};

initializeBlock(() => <ScheduleConflictsBlock />);
