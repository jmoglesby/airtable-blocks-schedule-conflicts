import {
    initializeBlock,
    useBase,
    useRecords,
    useGlobalConfig,
    Box,
    Heading,
    ViewPickerSynced,
    RecordCard,
} from '@airtable/blocks/ui';
import React from 'react';

const GlobalConfigKeys = {
    VIEW_ID: 'viewId',
};

const BaseSpecificNames = {
    PEOPLE_TABLE: 'People',
    APPOINTMENTS_TABLE: 'Appointments',
    PEOPLE_APPOINTMENTS_LINK_FIELD: 'Appointments',
    PEOPLE_NAME_FIELD: 'Name',
    APPOINTMENTS_NAME_FIELD: 'Name',
    APPOINTMENTS_START_FIELD: 'Start',
    APPOINTMENTS_END_FIELD: 'End'
}

function ScheduleConflictsBlock() {
    const base = useBase();
    const globalConfig = useGlobalConfig();

    // We want to render the list of records in this table.
    const appointmentsTable = base.getTableByName(BaseSpecificNames.APPOINTMENTS_TABLE);
    const peopleTable = base.getTableByName(BaseSpecificNames.PEOPLE_TABLE);

    // The view ID is stored in globalConfig using ViewPickerSynced.
    const viewId = globalConfig.get(GlobalConfigKeys.VIEW_ID);
    const appointmentsView = appointmentsTable.getViewByIdIfExists(viewId);

    const people = useRecords(peopleTable);
    const appointments = useRecords(appointmentsView);

    // Get a person's linked appointments and match them with the person
    const peopleAppointments = people.map(person => {
        const personLinkedAppointments = person.getCellValue(BaseSpecificNames.PEOPLE_APPOINTMENTS_LINK_FIELD);
        const appointmentIds = personLinkedAppointments.map(a => a.id);

        const personAppointments = appointments ? appointments.filter(a => appointmentIds.includes(a.id)) : [];

        const personAppntmntsObj = {
            person: person.getCellValue(BaseSpecificNames.PEOPLE_NAME_FIELD),
            appointments: personAppointments
        };
        return personAppntmntsObj;
    });

    // As we loop through person-appointment pairings, store any conflicts found in array
    const conflicts = [];

    // Loop and identify conflicts
    peopleAppointments.forEach(personAppntmnts => {
        const { person, appointments } = personAppntmnts;

        // Use a Set so that if an appointment is found to conflict with multiple other
        // appointments, it still only shows in the display once
        const conflictingRecords = new Set();
        const appointmentsChecked = [];
        for (var i=0; i < appointments.length; i++) {
            let start = new Date(appointments[i].getCellValue(BaseSpecificNames.APPOINTMENTS_START_FIELD));
            let end = new Date(appointments[i].getCellValue(BaseSpecificNames.APPOINTMENTS_END_FIELD));
            let appt = appointments[i];

            // since we check each appointment against all others,
            // we only want to do it once per appointment - we keep track here
            appointmentsChecked.push(appt.id);

            appointments.forEach(compareAppntmnt => {
                // don't check against appointments that have already been checked
                if (!appointmentsChecked.includes(compareAppntmnt.id)) {
                    let compareStart = new Date(compareAppntmnt.getCellValue(BaseSpecificNames.APPOINTMENTS_START_FIELD));
                    let compareEnd = new Date(compareAppntmnt.getCellValue(BaseSpecificNames.APPOINTMENTS_END_FIELD));

                    if (
                        // #1 : Preceeding Overlap
                        (compareStart > start && compareStart < end) ||
                        // #2 : Post-ceeding Overlap
                        (compareEnd > start && compareEnd < end) ||
                        // #3 : Contained (inclusive)
                        (compareStart <= start && compareEnd >= end)
                    ) {
                        // we found a conflict, so add both records to the Set
                        conflictingRecords.add(appt).add(compareAppntmnt);
                    }
                }
            });
        };

        if (conflictingRecords.size > 0) {
            const conflict = {person: person, conflictingAppointments: [...conflictingRecords]};
            conflicts.push(conflict);
        }
    });

    // If we have conflicts, display a ConflictContainer with all person-conflict pairings
    // If we have no conflicts, display a NoConflictsHeader
    const conflictsDisplay = conflicts.length > 0 ? conflicts.map((conflict, index) => {
        return <ConflictContainer
                    key={index}
                    person={conflict.person}
                    records={conflict.conflictingAppointments}
                />
    }) : <NoConflictsHeader />;

    return (
        <Box paddingX={2} marginX={1}>
            <h4>Select {BaseSpecificNames.APPOINTMENTS_TABLE} view to check conflicts in:</h4>
            <ViewPickerSynced table={appointmentsTable} globalConfigKey={GlobalConfigKeys.VIEW_ID} />
            {conflictsDisplay}
        </Box>
    );
}

function ConflictContainer({person, records}) {
    const recordsDisplay = records.length > 0 ? records.map((record, index) => {
        return <RecordCard
                    key={index}
                    record={record}
                    margin={1}
                    marginBottom={2}
                />
    }) : null;

    return (
        <Box margin={2} padding={3} backgroundColor="mistyrose" border="thick" borderRadius={5}>
            <Heading marginBottom={1}>{person}</Heading>
            <Box overflowX="auto" paddingRight={3}>
                {recordsDisplay}
            </Box>
        </Box>
    );
};

function NoConflictsHeader() {
    return (
        <Box padding={2}>
            <Heading size="large" textColor="light">
                No conflicts to display...
            </Heading>
        </Box>
    );
}

initializeBlock(() => <ScheduleConflictsBlock />);
