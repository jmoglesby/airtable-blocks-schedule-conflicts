import {
    initializeBlock,
    Button,
    useBase,
    useRecords,
    useGlobalConfig,
    Box,
    CellRenderer,
    Heading,
    Icon,
    Text,
    ViewPickerSynced,
} from '@airtable/blocks/ui';
import React from 'react';

const GlobalConfigKeys = {
    VIEW_ID: 'viewId',
};

function PrintRecordsBlock() {
    const base = useBase();
    const globalConfig = useGlobalConfig();

    // We want to render the list of records in this table.
    const appointmentsTable = base.getTableByName('Appointments');
    const peopleTable = base.getTableByName('People');

    // The view ID is stored in globalConfig using ViewPickerSynced.
    const viewId = globalConfig.get(GlobalConfigKeys.VIEW_ID);

    // The view may have been deleted, so we use getViewByIdIfExists
    // instead of getViewById. getViewByIdIfExists will return null
    // if the view doesn't exist.
    const view = table.getViewByIdIfExists(viewId);

    // Get people
    // Loop through people; for each, find all appointments in view
    // Loop through all person-appointments and check for conflicts
    // Store conflicting appointment as set in "conflicts" var to display

    return (
        <div>
            <h2>List of Conflicts Here</h2>
        </div>
    );
}

initializeBlock(() => <PrintRecordsBlock />);
